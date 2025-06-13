const express = require('express');
const app = express();

const registerRoute = require('./routes/register');
const buycjsRoute = require('./routes/buycjs');

app.use(express.json());

app.use('/register', registerRoute);   // Handles user verification + optional registration
app.use('/buycjs', buycjsRoute);       // Handles actual purchase (after validation)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CJS API live on port ${PORT}`);
});

