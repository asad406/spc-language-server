const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.n1ha416.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'Unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const usersCollection = client.db("spcSchoolDB").collection("users");
        const classesCollection = client.db("spcSchoolDB").collection("classes");
        const selectedClassesCollection = client.db("spcSchoolDB").collection("selectedClasses");
        const enrolledCollection = client.db("spcSchoolDB").collection("enrolledClasses");
        const paymentCollection = client.db("spcSchoolDB").collection("paymentHistory");

        //jwt token pass
        app.post("/jwt", async (req,res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_TOKEN, { expiresIn: "1h" })
            res.send({ token })
        })

        //payment history adding api
        app.post('/payment',verifyJWT, async (req, res) => {
            const history = req.body;
            const result = await paymentCollection.insertOne(history)
            res.send(result)
        })
        //payment history  api
        app.get('/paymenthistory',verifyJWT, async (req, res) => {
            const result = await paymentCollection.find().sort({ date: -1, time: -1 }).toArray()
            res.send(result)
        })
        //enrolled class adding api
        app.post('/enrolledclass', async (req, res) => {
            const enrolledClass = req.body;
            const result = await enrolledCollection.insertOne(enrolledClass)
            res.send(result)
        })
        //enrolled class  api
        app.get('/enrolledclass',verifyJWT, async (req, res) => {
            const result = await enrolledCollection.find().toArray()
            res.send(result)
        })
        //selected Class adding api
        app.post('/selectedclass', async (req, res) => {
            const selectedClass = req.body;
            const result = await selectedClassesCollection.insertOne(selectedClass)
            res.send(result)
        })

        // selected class getting api
        app.get('/selectedclass/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await selectedClassesCollection.find(query).toArray();
            res.send(result)
        })

        //selected class delete api
        app.delete('/selectedclass/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result)
        })
        //selected class delete api
        app.delete('/selectedclass/to/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result)
        })

        //all class api
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })
        //class adding api
        app.post('/classes', async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes);
            res.send(result);
        })
        //Class status change api
        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    status: 'Approved'
                }
            }
            const result = await classesCollection.updateOne(filter, updateRole);
            res.send(result);
        })
        app.patch('/classes/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    status: 'Denied'
                }
            }
            const result = await classesCollection.updateOne(filter, updateRole);
            res.send(result);
        })
        //Feedback
        app.patch('/classes/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    feedback: feedback?.feedback
                }
            }
            const result = await classesCollection.updateOne(filter, updateRole);
            res.send(result);
        })
        //seats reduce and enrolled student increase
        app.patch('/classes/status/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const filter = { _id: new ObjectId(id) };
            const enrolledClass = await classesCollection.findOne(filter)
            // console.log(enrolledClass)
            const updateStatus = {
                $set: {
                    seats: enrolledClass?.seats - 1,
                    totalEnrolled: enrolledClass?.totalEnrolled + 1

                }
            }
            const result = await classesCollection.updateOne(filter, updateStatus)
            // console.log(result)
        })
        //admin check api
        app.get('/users/admin/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            // console.log(result)
            res.send(result);
        })
        //All Instructors api
        app.get('/instructors', async (req, res) => {
            const query = { role: 'instructor' }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })
        //Instructor check api
        app.get('/users/instructor/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            // console.log(result)
            res.send(result);
        })

        //users api
        app.get('/users',verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        //user add api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'This user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //user to admin convert api
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateRole);
            res.send(result);
        })

        //user to instructor convert api
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    role: 'instructor'
                }
            }
            const result = await usersCollection.updateOne(filter, updateRole);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('SPC Language Server is Running...');
})


app.listen(port, () => {
    console.log('server is running on port', port)
})