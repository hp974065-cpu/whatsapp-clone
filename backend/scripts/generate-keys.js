// ============================================
// RSA Key Pair Generator
// ============================================
// Generates RS256 keys for JWT signing.
// Run: npm run generate:keys
// ============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'keys');

// Create keys directory if it doesn't exist
if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

console.log('✅ RSA key pair generated successfully:');
console.log(`   Private: ${path.join(keysDir, 'private.pem')}`);
console.log(`   Public:  ${path.join(keysDir, 'public.pem')}`);
