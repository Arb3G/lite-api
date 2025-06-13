// server.js
const express = require('express');
const cors = require('cors');
const registerRoute = require('./routes/register');
// const buyCJSRoute = require('./routes/buycjs'); // Optional if you implement this

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS if accessing from browser or external bots
app.use(express.json()); // For parsing JSON request bodies

// Routes
app.use('/register', registerRoute);
// app.use('/buycjs', buyCJSRoute); // Uncomment if you implement a buy endpoint

// Root route
app.get('/', (req, res) => {
  res.send('🟢 CJS Pay Server is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CJS Pay server started on http://localhost:${PORT}`);
});
