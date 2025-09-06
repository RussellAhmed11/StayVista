const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())



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

    // Verify Token Middleware
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
      const result =await roomCollection.deleteOne(query);
      res.send(result);
    })

    // booking related api
    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = bookingsCollection.insertOne(bookingData);
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
    app.get('/manage-bookings/:email', verifyToken,verifyHost, async (req, res) => {
      const email = req?.params?.email
      const query = { 'host.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    // delete a booking
      app.delete('/booking/:id', verifyToken, async (req, res) => {
      const id = req.params.id
       const query={_id:id}
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
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
