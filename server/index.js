const express = require('express')
const app = express()
require('dotenv').config()
const nodemailer = require("nodemailer");
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174','https://stayviste.web.app'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

const sendEmail =(emailAddress, emailData) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: process.env.Transproter_Email,
      pass: process.env.Transproter_Pass,
    },
  });
   transporter.verify(function (error,success){
    if(error){
      console.log(error)
    }else{
      console.log('server is ready to take our message')
    }
  })
  const emailBody = {
    from: `"stayVista" <${process.env.Transproter_Email}>`, // sender address
    to: emailAddress, // list of receivers
    subject: emailData?.subject, // Subject line
    html: emailData.message, // html body
  }
 
   transporter.sendMail(emailBody,(error,info)=>{
    if(error){
      console.log(error)
    }else{
      console.log('Email sent:' + info.response)
    }
   });
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hn7k2u4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const roomCollection = client.db('stayVista').collection('rooms')
    const usersCollection = client.db('stayVista').collection('users')
    const bookingsCollection = client.db('stayVista').collection('bookings')

    // Verify Token 
    const verifyToken = async (req, res, next) => {
      const token = req.cookies?.token
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          console.log(err)
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
        next()
      })
    }
    // verify aadmin middleware
    const verifyAdmin = async (req, res, next) => {
      const user = req?.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== 'admin') return res.status(401).send({ message: 'Unauthorized access' })
      next()
    }
    // verify host
    const verifyHost = async (req, res, next) => {
      const user = req?.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== 'host') return res.status(401).send({ message: 'Unauthorized access' })
      next()
    }

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const price = req.body.price;
      const priceInCent = parseFloat(price) * 100;
      if (!price && priceInCent < 1) return;
      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        }
      })

      res.send({ clientSecret: client_secret })

    })
    app.put('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
      const isExist = await usersCollection.findOne({ email: user?.email });
      if (isExist) {
        if (user?.status === 'Requested') {
          const result = await usersCollection.updateOne(query, { $set: { status: user?.status } })
          return res.send(result)
        } else {
          return res.send(isExist)
        }
      }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timeStamp: Date.now()
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc, options);
       sendEmail(user?.email, {
        subject: 'welcome to StayVista!',
        message: `Brows Room and book them`,
      })
      res.send(result);
    })
    // get all user info
    app.get('/user/:email', async (req, res) => {
      const email = req?.params?.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    })
    // get all user data
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users)
    })
    // update user
    app.patch('/users/update/:email', async (req, res) => {
      const email = req?.params?.email;
      const user = req?.body;
      const query = { email };
      const updateDoc = {
        $set: {
          ...user, timeStamp: Date.now()
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // get all rooms
    app.get('/rooms', async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category && category !== 'null') query = { category };
      const result = await roomCollection.find(query).toArray();
      res.send(result)
    })
    // save a room to db
    app.post('/room', verifyToken, verifyHost, async (req, res) => {
      const roomData = req.body;
      const result = await roomCollection.insertOne(roomData);
      res.send(result)
    })
    // get single room data
    app.get('/room/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomCollection.findOne(query);
      res.send(result);
    })
    app.get('/my-listing/:email', verifyToken, verifyHost, async (req, res) => {
      const email = req.params.email;
      const query = { 'host.email': email };
      const result = await roomCollection.find(query).toArray();
      res.send(result);
    })
    // delete room
    app.delete('/room/:id', verifyToken, verifyHost, async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.deleteOne(query);
      res.send(result);
    })
    // update room data
    app.put('/room/update/:id', verifyToken, verifyHost, async (req, res) => {
      const id = req?.params?.id
      const roomData = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: roomData
      }
      const result = await roomCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // booking related api
    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = bookingsCollection.insertOne(bookingData);
         // send email to guest
      sendEmail(bookingData?.guest?.email, {
        subject: 'Booking Successful!',
        message: `You've successfully booked a room through StayVista. Transaction Id: ${bookingData.transactionId}`,
      })
      // send email to host
      sendEmail(bookingData?.host?.email, {
        subject: 'Your room got booked!',
        message: `Get ready to welcome ${bookingData.guest.name}.`,
      })
      res.send(result)
    })
    app.patch('/room/status/:id', verifyToken, async (req, res) => {
      const id = req?.params?.id
      const status = req?.body?.status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { booked: status }
      }
      const result = await roomCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // get all booking for guest
    app.get('/my-bookings/:email', verifyToken, async (req, res) => {
      const email = req?.params?.email
      const query = { 'guest.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    // host api
    app.get('/manage-bookings/:email', verifyToken, verifyHost, async (req, res) => {
      const email = req?.params?.email
      const query = { 'host.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    // delete a booking
    app.delete('/booking/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: id }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })
    // admin stat
    app.get('/admin-stat', verifyToken, verifyAdmin, async (req, res) => {
      const bookingDetails = await bookingsCollection.find({}, {
        projection: {
          date: 1,
          price: 1
        }
      }).toArray()
      const totalRooms = await roomCollection.countDocuments()
      const totalUsers = await usersCollection.countDocuments()
      const totalPrice = bookingDetails.reduce((sum, booking) => sum + booking?.price, 0)
      const chartData = bookingDetails.map(booking => {
        const day = new Date(booking.date).getDate()
        const month = new Date(booking.date).getMonth() + 1
        const data = [`${day}/${month}`, booking?.price]
        return data
      })
      chartData.unshift(['Day', 'Sales'])
      // chartData.splice(0,0,['Day','Sales'])

      res.send({ totalRooms, totalUsers, totalBookings: bookingDetails?.length, totalPrice, chartData })
    })
    app.get('/host-stat', verifyToken, verifyHost, async (req, res) => {
      const { email } = req.user
      const bookingDetails = await bookingsCollection.find({ 'host.email': email }, {
        projection: {
          date: 1,
          price: 1
        }
      }).toArray()
      const totalRooms = await roomCollection.countDocuments({ 'host.email': email })
      const totalPrice = bookingDetails.reduce((sum, booking) => sum + booking?.price, 0)
      const { timeStamp } = await usersCollection.findOne({ email }, { projection: { timeStamp: 1 } })
      const chartData = bookingDetails.map(booking => {
        const day = new Date(booking.date).getDate()
        const month = new Date(booking.date).getMonth() + 1
        const data = [`${day}/${month}`, booking?.price]
        return data
      })
      chartData.unshift(['Day', 'Sales'])
      // chartData.splice(0,0,['Day','Sales'])

      res.send({ totalRooms, totalBookings: bookingDetails?.length, totalPrice, chartData, hostSince: timeStamp })
    })
    app.get('/guest-stat', verifyToken, async (req, res) => {
      const { email } = req.user
      const bookingDetails = await bookingsCollection.find({ 'guest.email': email }, {
        projection: {
          date: 1,
          price: 1
        }
      }).toArray()
      const totalPrice = bookingDetails.reduce((sum, booking) => sum + booking?.price, 0)
      const { timeStamp } = await usersCollection.findOne({ email }, { projection: { timeStamp: 1 } })
      const chartData = bookingDetails.map(booking => {
        const day = new Date(booking.date).getDate()
        const month = new Date(booking.date).getMonth() + 1
        const data = [`${day}/${month}`, booking?.price]
        return data
      })
      chartData.unshift(['Day', 'Sales'])
      // chartData.splice(0,0,['Day','Sales'])

      res.send({ totalBookings: bookingDetails?.length, totalPrice, chartData, guestSince: timeStamp })
    })


    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from StayVista Server..')
})

app.listen(port, () => {
  console.log(`StayVista is running on port ${port}`)
})
