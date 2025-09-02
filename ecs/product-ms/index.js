const express = require('express');
// const fs = require('fs');
// const https = require('https');
// const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const {getConnection} = require('./dbConnection');

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

// Sample product data (in-memory database)
const products = {
    1: { id: 1, name: 'Laptop', price: 1500 },
    2: { id: 2, name: 'Mobile', price: 800 },
    3: { id: 3, name: 'Tablet', price: 1200 },
    4: { id: 4, name: 'Headphones', price: 100 },
    5: { id: 5, name: 'Camera', price: 1200 },
  };

  // API Endpoint to fetch product by ID
  app.get('/api/products/search/:term', async (req, res) => {
    const term = req.params.term;
    console.log(`Received request for search term: ${term}`);
  
    // if (isNaN(productId)) {
    //   console.log('Invalid product ID');
    //   return res.status(400).json({ message: 'Invalid product ID' });
    // }
    
    const connection = await getConnection();
    try {
      // get user from database
      const query = "SELECT * FROM products WHERE lower(product_name) like '%' || $1 || '%' ";
      const values = [term.toLowerCase()];
      const searched = await connection.query(query, values);
      console.log(searched.rows.length);
      
      res.status(200);
      res.send({
        result: true,
        total: searched.rows.length,
        searchResults: searched.rows
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
    
    // const product = products[productId];
    // if (product) {
    //   console.log(`Found product: ${JSON.stringify(product)}`);
    //   res.json(product);
    // } else {
    //   console.log(`Product not found for ID: ${productId}`);
    //   res.status(404).json({ message: 'Product not found' });
    // }
  });

  // API Endpoint to fetch product by ID
  app.get('/api/products/search', async (req, res) => {
    console.log('Received request for searching for all products');
      
    const connection = await getConnection();
    try {
      // get user from database
      const query = "SELECT * FROM products";
      const searched = await connection.query(query);
      console.log(searched.rows.length);
      
      res.status(200);
      res.send({
        result: true,
        total: searched.rows.length,
        searchResults: searched.rows
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
    
    // const product = products[productId];
    // if (product) {
    //   console.log(`Found product: ${JSON.stringify(product)}`);
    //   res.json(product);
    // } else {
    //   console.log(`Product not found for ID: ${productId}`);
    //   res.status(404).json({ message: 'Product not found' });
    // }
  });

  
  // API Endpoint to fetch product by ID
  app.get('/api/products/:productId', async (req, res) => {
    const productId = req.params.productId;
    console.log(`Received request for product ID: ${productId}`);
  
    // if (isNaN(productId)) {
    //   console.log('Invalid product ID');
    //   return res.status(400).json({ message: 'Invalid product ID' });
    // }
    
    const connection = await getConnection();
    try {
      // get user from database
      const query = 'SELECT * FROM products WHERE product_id = $1';
      const values = [productId];
      const result = await connection.query(query, values);
      console.log(result.rows[0]);
      
      res.status(200);
      res.send({
        result: true,
        product: result.rows[0]
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
    
    // const product = products[productId];
    // if (product) {
    //   console.log(`Found product: ${JSON.stringify(product)}`);
    //   res.json(product);
    // } else {
    //   console.log(`Product not found for ID: ${productId}`);
    //   res.status(404).json({ message: 'Product not found' });
    // }
  });
  
// list of products 
// API Endpoint to fetch all products
app.get('/api/products', async (req, res) => {
  // console.log('Received request for all products');
  // const productList = Object.values(products);
  // console.log(`Returning ${productList.length} products`);
  // res.json(productList);

  const connection = await getConnection();
  try {

    // get user from database
    const query = 'SELECT * FROM products';
    const result = await connection.query(query);

    res.status(200);
    res.send({
      result: true,
      products: result.rows
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

/*const products = [
    { id: 1, name: 'Laptop', price: 1500 },
    { id: 2, name: 'Mobile', price: 800 },
    { id: 3, name: 'Tablet', price: 1200 }, 
    { id: 4, name: 'Headphones', price: 100 },
    { id: 5, name: 'Camera', price: 1200 },
];

// api to fetch all product
app.get('/api/products', (req, res) => {
    res.json(products);
});*/

// API Endpoint to fetch product by ID
/*app.get('/api/products/:productId', (req, res) => {
    const productId = req.params.productId;
    const product = products[productId];
    if (product) {
      res.json(product);
      console.log(`Found product: ${JSON.stringify(product)}`);
    } else {
      console.log(`Product not found for ID: ${productId}`);
      res.status(404).json({ message: 'Product is not in stock' });
    }
  });*/


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
// sslServer.listen(5000, () => {
//   console.log('product Microservice is running on https://localhost:5000');
// });

const httpServer = require('http').createServer(app);
httpServer.listen(5000,'0.0.0.0', () => {
  console.log('Product Microservice is running on http://0.0.0.0:5000');
});
