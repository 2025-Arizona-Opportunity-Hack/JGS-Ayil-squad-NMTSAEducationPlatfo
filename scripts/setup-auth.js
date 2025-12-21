#!/usr/bin/env node
/**
 * Setup script for Convex Auth environment variables.
 * Generates a matching RSA key pair and sets JWT_PRIVATE_KEY and JWKS.
 */
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('🔐 Generating RSA key pair for Convex Auth...\n');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Convert public key to JWK format
const pubKeyObj = crypto.createPublicKey(publicKey);
const jwk = pubKeyObj.export({ format: 'jwk' });
jwk.kid = 'convex-auth-key';
jwk.use = 'sig';
jwk.alg = 'RS256';

const jwks = JSON.stringify({ keys: [jwk] });

console.log('Setting JWT_PRIVATE_KEY...');
try {
  execSync(`npx convex env set JWT_PRIVATE_KEY -- "${privateKey}"`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Failed to set JWT_PRIVATE_KEY');
  process.exit(1);
}

console.log('\nSetting JWKS...');
try {
  execSync(`npx convex env set JWKS '${jwks}'`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Failed to set JWKS');
  process.exit(1);
}

console.log('\n✅ Auth environment variables configured successfully!');
