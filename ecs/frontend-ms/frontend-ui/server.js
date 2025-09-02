const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3000;

https.createServer({
  key: fs.readFileSync(path.join(__dirname, '../../certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certs', 'server.cert'))
}, app)
.listen(port, function () {
  console.log(`Frontend server listening on https://localhost:${port}`);
});

