const bcrypt = require('bcrypt');

async function test() {
  const pass = 'admin';
  const hash = await bcrypt.hash(pass, 10);
  console.log('Test hash:', hash);
  const match = await bcrypt.compare(pass, hash);
  console.log('Self test match:', match);
}

test();
