const axios = require('axios');

async function testRegister() {
  const res = await axios.post('http://localhost:3000/register', {
    userId: 'rbg123',
    step: 'confirm',
    answer: 'yes'
  });

  console.log(res.data);
}

testRegister();
