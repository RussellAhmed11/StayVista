import PropTypes from 'prop-types'
import UpdateUserModal from '../../Modal/UpdateUserModal'
import { useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { axiosSecure } from '../../../hooks/useAxiosSecure';
import toast from 'react-hot-toast';
const UserDataRow = ({ user, refetch }) => {
    const {user:loggedUser}=useAuth()
     const [IsOpen,setIsopen]=useState(false);
     const {mutateAsync}=useMutation({
      mutationFn:async role=>{
        const {data}=await axiosSecure.patch(`/users/update/${user?.email}`,role)
        return data
      },onSuccess:data=>{
        refetch()
        toast.success("User role update successfully")
        setIsopen(false)
      }
     })
     const handlemodel=async(selected)=>{
        if(loggedUser?.email ===user?.email){
            toast.error('Action Not Allowed')
           return setIsopen(false)
        }
        const userRole={    
            role:selected,
            status:'verified'
        }
        try{
         await mutateAsync(userRole)
        }catch(err){console.log(err)}
     }
  return (
    <tr>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{user?.email}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{user?.role}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        {user?.status ? (
          <p
            className={`${
              user.status === 'Verified' ? 'text-green-500' : 'text-yellow-500'
            } whitespace-no-wrap`}
          >
            {user.status}
          </p>
        ) : (
          <p className='text-red-500 whitespace-no-wrap'>Unavailable</p>
        )}
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <button onClick={()=>setIsopen(true)} className='relative cursor-pointer inline-block px-3 py-1 font-semibold text-green-900 leading-tight'>
          <span
            aria-hidden='true'
            className='absolute inset-0 bg-green-200 opacity-50 rounded-full'
          ></span>
          <span className='relative'>Update Role</span>
        </button>
       <UpdateUserModal IsOpen={IsOpen} setIsOpen={setIsopen} handlemodel={handlemodel} user={user}/>
      </td>
    </tr>
  )
}

UserDataRow.propTypes = {
  user: PropTypes.object,
  refetch: PropTypes.func,
}

export default UserDataRow