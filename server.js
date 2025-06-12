const express = require('express');
const app = express();
const buycjsRoute = require('./routes/buycjs');

app.use(express.json());
app.use('/buycjs', buycjsRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CJS API is live on port ${PORT}`);
});
