
import PropTypes from 'prop-types'
import {
    Dialog,
    Transition,
    TransitionChild,
    DialogPanel,
    DialogTitle,
} from '@headlessui/react'
import { ImSpinner9 } from 'react-icons/im'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import './CheckOutForm.css'
import { useEffect, useState } from 'react';
import { axiosSecure } from '../../hooks/useAxiosSecure';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CheckOutForm = ({ closeModal, bookingInfo,refetch }) => {
    const navigate=useNavigate()
    const { user } = useAuth()
    const stripe = useStripe();
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState('');
    const [cardError, setCardError] = useState('');
    const [processing, setProcessing] = useState(false)
    useEffect(() => {
        if (bookingInfo?.price && bookingInfo?.price > 1) {
            getClientSecret({ price: bookingInfo?.price })
        }
    }, [])
    const getClientSecret = async (price) => {
        const { data } = await axiosSecure.post('/create-payment-intent', price)
        setClientSecret(data.clientSecret)
    }

    const handleSubmit = async (event) => {
        // Block native form submission.
        event.preventDefault();
        setProcessing(true)

        if (!stripe || !elements) {
            // Stripe.js has not loaded yet. Make sure to disable
            // form submission until Stripe.js has loaded.
            return;
        }

        // Get a reference to a mounted CardElement. Elements knows how
        // to find your CardElement because there can only ever be one of
        // each type of element.
        const card = elements.getElement(CardElement);

        if (card == null) {
            return;
        }

        // Use your card Element with other Stripe.js APIs
        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card,
        });

        if (error) {
            console.log('[error]', error);
            setProcessing(false)
            setCardError(error)
        } else {
            console.log('[PaymentMethod]', paymentMethod);
        }
        // confirm payment
        const { error: confirmError, paymentIntent } =
            await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: card,
                    billing_details: {
                        email: user?.email,
                        name: user?.displayName,
                    },
                },
            })
        if (confirmError) {
            console.log(confirmError)
            setCardError(confirmError.message)
            setProcessing(false)
            return
        }
       if(paymentIntent.status ==='succeeded'){
        const paymentInfo={
            ...bookingInfo,
            roomId:bookingInfo._id,
            transactionId:paymentIntent.id,
            date:new Date()
        }
         try{
         const {data}=await axiosSecure.post('/booking',paymentInfo)
         await axiosSecure.patch(`/room/status/${bookingInfo._id}`,{status:true})
        //  update ui
        refetch()
        closeModal()
        toast.success('Room book success')
        navigate('/dashboard/my-bookings')
         }catch(error){

         }
       }
      
    setProcessing(false)
    };



    return (
        <div>
            <form onSubmit={handleSubmit}>
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#424770',
                                '::placeholder': {
                                    color: '#aab7c4',
                                },
                            },
                            invalid: {
                                color: '#9e2146',
                            },
                        },
                    }}
                />
                <div className='flex mt-2 justify-around'>
                    <button
                        disabled={!stripe || !clientSecret || processing}
                        type='submit'
                        className='inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2'
                    >
                        {processing ? (
                            <ImSpinner9 className='animate-spin m-auto' size={24} />
                        ) : (
                            `Pay ${bookingInfo?.price}`
                        )}
                    </button>
                    <button
                        onClick={closeModal}
                        type='button'
                        className='inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
                    >
                        Cancel
                    </button>
                </div>
            </form>
            {
                cardError && <p className='text-red-600 ml-8'>{cardError}</p>
            }
        </div>
    );
};

CheckOutForm.propTypes = {
    bookingInfo: PropTypes.object,
    closeModal: PropTypes.func,
    isOpen: PropTypes.bool,
}

export default CheckOutForm;

