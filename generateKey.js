const { generateKeyPairSync } = require('crypto');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048, // the length of your key in bits
  publicKeyEncoding: {
    type: 'spki', // recommended to be 'spki' by the Node.js docs
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8', // recommended to be 'pkcs8' by the Node.js docs
    format: 'pem',
  },
});

console.log('private key:');
console.log(Buffer.from(privateKey).toString('base64'));

console.log('\npublic key:');
console.log(Buffer.from(publicKey).toString('base64'));