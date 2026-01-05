#!/usr/bin/env node
/**
 * Setup script for Convex environment variables.
 * Configures Auth (JWT), Resend (Email), and Twilio (SMS) credentials.
 * 
 * Usage:
 *   node scripts/setup-env.js
 *   node scripts/setup-env.js --auth-only
 *   node scripts/setup-env.js --skip-auth
 */
const crypto = require('crypto');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function setEnvVar(name, value, description) {
  console.log(`\nSetting ${name}...`);
  try {
    // Use -- to handle values with special characters
    execSync(`npx convex env set ${name} -- "${value.replace(/"/g, '\\"')}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    return true;
  } catch (error) {
    console.error(`Failed to set ${name}`);
    return false;
  }
}

async function setupAuth() {
  console.log('\n🔐 Setting up Authentication (JWT Keys)...\n');

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

  if (!await setEnvVar('JWT_PRIVATE_KEY', privateKey)) return false;
  
  console.log('\nSetting JWKS...');
  try {
    execSync(`npx convex env set JWKS '${jwks}'`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Failed to set JWKS');
    return false;
  }

  console.log('✅ Auth configured successfully!');
  return true;
}

async function setupResend() {
  console.log('\n📧 Setting up Resend (Email)...\n');
  console.log('Get your API key from: https://resend.com/api-keys\n');

  const apiKey = await prompt('Enter your Resend API Key (or press Enter to skip): ');
  
  if (!apiKey.trim()) {
    console.log('⏭️  Skipping Resend setup');
    return true;
  }

  if (!await setEnvVar('RESEND_API_KEY', apiKey.trim())) return false;

  const domain = await prompt('Enter your verified email domain (or press Enter for resend.dev): ');
  if (domain.trim()) {
    if (!await setEnvVar('RESEND_DOMAIN', domain.trim())) return false;
  }

  console.log('✅ Resend configured successfully!');
  return true;
}

async function setupTwilio() {
  console.log('\n📱 Setting up Twilio (SMS)...\n');
  console.log('Get your credentials from: https://console.twilio.com\n');

  const accountSid = await prompt('Enter your Twilio Account SID (or press Enter to skip): ');
  
  if (!accountSid.trim()) {
    console.log('⏭️  Skipping Twilio setup');
    return true;
  }

  if (!await setEnvVar('TWILIO_ACCOUNT_SID', accountSid.trim())) return false;

  const authToken = await prompt('Enter your Twilio Auth Token: ');
  if (!authToken.trim()) {
    console.error('Auth Token is required');
    return false;
  }
  if (!await setEnvVar('TWILIO_AUTH_TOKEN', authToken.trim())) return false;

  const phoneNumber = await prompt('Enter your Twilio Phone Number (e.g., +14155551234): ');
  if (!phoneNumber.trim()) {
    console.error('Phone Number is required');
    return false;
  }
  if (!await setEnvVar('TWILIO_PHONE_NUMBER', phoneNumber.trim())) return false;

  console.log('✅ Twilio configured successfully!');
  return true;
}

async function setupSiteUrl() {
  console.log('\n🌐 Setting up Site URL...\n');

  const siteUrl = await prompt('Enter your site URL (e.g., https://yoursite.com, or press Enter to skip): ');
  
  if (!siteUrl.trim()) {
    console.log('⏭️  Skipping Site URL setup (will default to https://nmtsa.com)');
    return true;
  }

  if (!await setEnvVar('SITE_URL', siteUrl.trim())) return false;

  console.log('✅ Site URL configured successfully!');
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const authOnly = args.includes('--auth-only');
  const skipAuth = args.includes('--skip-auth');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           NMTSA Education Platform - Setup Script          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('This script will configure the following environment variables:');
  if (!skipAuth) console.log('  • JWT_PRIVATE_KEY & JWKS (Authentication)');
  if (!authOnly) {
    console.log('  • RESEND_API_KEY & RESEND_DOMAIN (Email notifications)');
    console.log('  • TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (SMS)');
    console.log('  • SITE_URL (Base URL for links in emails/SMS)');
  }
  console.log('');

  try {
    // Auth setup (generates keys automatically)
    if (!skipAuth) {
      if (!await setupAuth()) {
        console.error('\n❌ Auth setup failed');
        process.exit(1);
      }
    }

    if (!authOnly) {
      // Resend setup
      if (!await setupResend()) {
        console.error('\n❌ Resend setup failed');
        process.exit(1);
      }

      // Twilio setup
      if (!await setupTwilio()) {
        console.error('\n❌ Twilio setup failed');
        process.exit(1);
      }

      // Site URL setup
      if (!await setupSiteUrl()) {
        console.error('\n❌ Site URL setup failed');
        process.exit(1);
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Setup completed successfully!              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('  1. Run `npx convex dev` to start the development server');
    console.log('  2. Run `npm run dev` to start the frontend');
    console.log('');

  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
