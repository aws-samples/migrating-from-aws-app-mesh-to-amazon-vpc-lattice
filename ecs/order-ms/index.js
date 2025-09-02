const express = require('express');
// const fs = require('fs');
// const https = require('https');
// const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(bodyParser.json());

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// app.use(cors());

// const httpsAgent = new https.Agent({
//     rejectUnauthorized: false,
//   });

// Get service URLs from environment variables or use defaults
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:4000';
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5000';
console.log('User Service URL:', userServiceUrl);
console.log('Product Service URL:', productServiceUrl);

app.post('/api/orders/:orderId', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  try {
      // check if user exists
      
      const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, { });
      const user = userResponse.data;
      console.log(user);
      if (!user) return res.status(404).send('User not found');

      // check if product exists
      const productResponse = await axios.get(`${productServiceUrl}/api/products/${productId}`, { });
      console.log(productResponse.data);
      const product = productResponse.data;
      console.log(product);
      if (!product) return res.status(404).send('Product not found');

      // Dummy order processing
      console.log(`Order received: User ID = ${userId}, Product ID = ${productId}, Quantity = ${quantity}`);

      // Respond with a success message
      res.json({ message: 'Order placed successfully!' });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/api/orders', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        // check if user exists
        
        const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, { });
        const user = userResponse.data;
        console.log(user);
        if (!user) return res.status(404).send('User not found');

        // check if product exists
        const productResponse = await axios.get(`${productServiceUrl}/api/products/${productId}`, { });
        console.log(productResponse.data);
        const product = productResponse.data;
        console.log(product);
        if (!product) return res.status(404).send('Product not found');

        // Dummy order processing
        console.log(`Order received: User ID = ${userId}, Product ID = ${productId}, Quantity = ${quantity}`);

        // Respond with a success message
        res.json({ message: 'Order placed successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Load SSL certificate
// const sslServer = https.createServer(
//     {
//       //key: fs.readFileSync(path.join(__dirname, '../certs', 'server.key')),
//       //cert: fs.readFileSync(path.join(__dirname, '../certs', 'server.cert')),
//       key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
//       cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.cert')),
//     },
//     app
//   );

// Start the HTTPS server
// sslServer.listen(7000, () => {
//   console.log('order Microservice is running on https://localhost:7000');
// });

const httpServer = require('http').createServer(app);
httpServer.listen(7000,'0.0.0.0', () => {
  console.log('Order Microservice is running on http://localhost:7000');
});