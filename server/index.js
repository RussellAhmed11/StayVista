const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb')
const jwt = require('jsonwebtoken')

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

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
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
    const roomCollection=client.db('stayVista').collection('rooms')
    const usersCollection=client.db('stayVista').collection('users')
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
    app.put('/user',async(req,res)=>{
      const user=req.body;
       const query={email:user?.email}
      const isExist=await usersCollection.findOne({email:user?.email});
      if(isExist) {
        if(user?.status ==='Requested'){
          const result=await usersCollection.updateOne(query,{$set:{status:user?.status}})
          return req.sen(result)
      }else{
         return res.send(isExist)
        }
      }
      const options={upsert:true}
      const updateDoc={
        $set:{
          ...user,
          timeStamp:Date.now()
        }
      }
      const result=await usersCollection.updateOne(query,updateDoc,options);
      res.send(result);
    })
    // get all user info
    app.get('/user/:email',async(req,res)=>{
      const email=req?.params?.email;
      const result=await usersCollection.findOne({email});
      res.send(result);
    })
    // get all user data
    app.get('/users',async(req,res)=>{
      const users=await usersCollection.find().toArray();
      res.send(users)
    })
    app.patch('/users/update/:email',async(req,res)=>{
      const email=req?.params?.email; 
      const user=req?.body;
      const query={email:email};
      const updateDoc={
        $set:{
          ...user,timeStamp:Date.now()
        }
      }
      const result=await usersCollection.updateOne(query,updateDoc)
      res.send(result)
    })
    // get all rooms
    app.get('/rooms',async(req,res)=>{
      const category=req.query.category;
      let query={};
      if(category && category!=='null') query={category};
      const result=await roomCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/room',async(req,res)=>{
      const roomData=req.body;
      const result=await roomCollection.insertOne(roomData);
      res.send(result)
    })
    // get single room data
    app.get('/room/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await roomCollection.findOne(query);
      res.send(result);
    })
    app.get('/my-listing/:email',async(req,res)=>{
        const email=req.params.email;
        const query={'host.email':email};
        const result=await roomCollection.find(query).toArray();
        res.send(result); 
    })
    // delete room
    app.delete('/room/:id',async(req,res)=>{
     const id=req?.params?.id;
     const query={_id:new ObjectId(id)};
     const result=roomCollection.deleteOne(query);
     res.send(result);
    })
    // Logout
   

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
