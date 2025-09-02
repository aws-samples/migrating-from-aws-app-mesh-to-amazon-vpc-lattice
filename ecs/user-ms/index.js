const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const cors = require('cors');

/*const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['https://localhost:7000', 'https://localhost:5000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
*/
app.use(bodyParser.json());
app.use(cors());

// add a custom express middleware to load secrets from AWS Secrets Manager
const {getConnection} = require('./dbConnection');

// Dummy user data
// const users = {
//   1: { id: 1, name: 'John Doe', email: 'john@example.com' },
//   2: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
//   3: { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
//   4: { id: 4, name: 'Alice Williams', email: 'alice@example.com' },
//   5: { id: 5, name: 'Tom Davis', email: 'tom@example.com' },
//   6: { id: 6, name: 'Emily Wilson', email: 'emily@example.com' },
//   7: { id: 7, name: 'Michael Brown', email: 'michael@example.com' },
//   8: { id: 8, name: 'Sophia Taylor', email: 'sophia@example.com' },
//   9: { id: 9, name: 'David Anderson', email: 'david@example.com' },
//   10: { id: 10, name: 'Emma Thomas', email: 'emma@example.com' },
// };

// API Endpoint to fetch user data by ID
app.get('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;

  const connection = await getConnection();
  try {
    // get user from database
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const values = [userId];
    const result = await connection.query(query, values);
    console.log(result.rows[0]);
    
    res.status(200);
    res.send({
      result: true,
      user: result.rows[0]
    });

  } catch (err) {
    console.log(err);
    res.status(200);
    res.send({
      result: false,
      error: err
    });
  } finally {
    connection.release();
  }

});

// New API Endpoint to fetch all users
app.get('/api/users', async (req, res) => {

  const connection = await getConnection();
  try {
    // get user from database
    const query = 'SELECT * FROM users';
    const result = await connection.query(query);
    
    res.status(200);
    res.send({
      result: true,
      users: result.rows
    });

  } catch (err) {
    console.log(err);
    res.status(200);
    res.send({
      result: false,
      error: err
    });
  } finally {
    connection.release();
  }
  
});

const httpServer = require('http').createServer(app);
httpServer.listen(4000,'0.0.0.0', () => {
  console.log('User Microservice is running on http://0.0.0.0:4000');
});
