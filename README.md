# NMTSA Education Platform

A learning management system for Neurological Music Therapy Services of Arizona, built with [React](https://react.dev/), [Convex](https://convex.dev), and [Vite](https://vitejs.dev/).

**[View Full Documentation](DOCUMENTATION.md)**

## Quick Start

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account

### Interactive Setup

The fastest way to get running. The setup wizard walks you through every integration:

```bash
npm install
npm run setup
```

This will prompt you for credentials and configure:

- Convex backend connection (required)
- Authentication keys
- Email notifications (Resend)
- SMS notifications (Twilio)
- Stripe payments
- Google Drive integration

It writes your `.env.local` file and pushes server-side variables to Convex automatically.

### Manual Setup

If you prefer to configure manually:

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the values (see [Environment Variables](#environment-variables) below)

3. Generate auth keys:
   ```bash
   npm run setup:auth
   ```

4. Start development:
   ```bash
   npm run dev
   ```

### First Run

When you first open the app, a **setup wizard** guides the owner through:

1. **Sign in** - Create the owner account (first user gets owner role automatically)
2. **Profile** - Set your name and avatar
3. **Organization** - Configure org name, logo, brand colors, and default notification preferences
4. **Complete** - Creates the owner profile, site settings, and notification defaults in one atomic transaction

After setup, an **onboarding tour** highlights key areas of the admin dashboard.

## Project Structure

```
src/                  # Frontend (React + Vite)
  components/         # UI components
    admin/            # Admin dashboard components
    client/           # Client-facing components
    setup/            # Setup wizard and onboarding tour
    ui/               # Shadcn UI primitives
convex/               # Backend (Convex functions + schema)
scripts/              # CLI tools (setup wizard)
```

## Environment Variables

All integrations are optional except Convex. Features gracefully disable when credentials are absent (e.g., the Google Drive import button won't appear, notification toggles show channels as unconfigured).

| Variable | Required | Description |
|----------|----------|-------------|
| `CONVEX_DEPLOYMENT` | Yes | Convex deployment identifier |
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID (enables "Sign in with Google") |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret |
| `VITE_GOOGLE_CLIENT_ID` | No | Google Drive picker client ID |
| `VITE_GOOGLE_API_KEY` | No | Google Drive picker API key |
| `VITE_GOOGLE_APP_ID` | No | Google Cloud project number |
| `RESEND_API_KEY` | No | Resend API key (enables email notifications) |
| `RESEND_DOMAIN` | No | Verified sending domain for Resend |
| `TWILIO_ACCOUNT_SID` | No | Twilio Account SID (enables SMS notifications) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio sender phone number (E.164 format) |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (enables paid content) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret (required if Stripe is enabled) |
| `SITE_URL` | Production | Frontend URL for email links and CORS |

See `.env.example` for the full template with comments.

## Authentication

The platform supports multiple auth methods via [Convex Auth](https://auth.convex.dev/):

- **Email/password** - Available by default
- **Google OAuth** - Requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

### Setting Up Google OAuth

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   - Dev: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
   - Prod: `https://your-domain.com/api/auth/callback/google`
5. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env.local`

### Join Requests

New users who don't have an invite code can submit a **join request**. The flow:

1. User submits email + name via the join request form
2. A verification email is sent (requires Resend)
3. User clicks the verification link
4. Admin reviews and approves/denies the request
5. Once approved, the user can sign up with that email

## Features

### Content Management

- Upload videos, documents, audio, and articles
- Rich text editor (Lexical) for articles
- Import files from Google Drive (when configured)
- Content versioning with full edit history
- Publishing workflow: Draft > Review > Published
- Tags, descriptions, and availability dates

### Access Control

Three methods for granting content access:

- **Individual** - Grant specific users access to specific content
- **Role-based** - Grant access to all users with a given role
- **User groups** - Create groups and grant access to the whole group

Content groups let you bundle related materials and manage permissions at the collection level.

### Sharing

- **Share links** - Secure, trackable links with optional password protection and expiration
- **Recommendations** - Professionals can recommend content to clients with personalized messages

### E-Commerce

- Set prices on content with optional time-limited access
- Client-facing shop with purchase flow
- Stripe integration for payment processing
- Order management and refund handling

### Notifications

Per-event email and SMS routing, configurable in Site Settings:

- Content access granted
- Purchase approved/denied
- Recommendations
- Join request approvals
- Email verification

Channel availability is auto-detected from your environment variables. Admins can enable/disable notifications per event and per channel.

### Theming

Light and dark mode support via a toggle in the navbar. Uses CSS custom properties with Tailwind, so the entire UI adapts seamlessly. User preference is persisted locally.

### Analytics

- Content views and unique viewers
- Real-time presence (who's viewing what now)
- Sales data and revenue tracking

## Google Drive Integration

Optional. When `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CLIENT_ID` are set, an "Import from Google Drive" button appears in the content manager. When not set, the button is hidden entirely.

### Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Google Drive API** and **Google Picker API**
2. Configure the OAuth consent screen with scope `drive.readonly`
3. Create an OAuth 2.0 Client ID (Web application) with your origins
4. Create an API key (restrict to Drive API + Picker API)
5. Get your project number from Project Settings
6. Set in `.env.local`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your-api-key
   VITE_GOOGLE_APP_ID=your-project-number
   ```

For detailed step-by-step instructions, see [DOCUMENTATION.md](DOCUMENTATION.md).

## User Invitation

### Admin/Editor Invite Codes

Admins can generate invite codes that grant specific roles (admin, editor, contributor) on sign-up. Codes can have expiration dates and can be deactivated.

### Client Invitations

A dedicated flow for inviting clients, parents, and professionals:

- Send via email, SMS, or both
- Include a personalized message
- Track invitation status (sent, used, expired)
- Resend invitations

## Deployment

### Production Setup

```bash
npm run setup   # Select "Production" when prompted
```

The setup script can push environment variables to Vercel or Netlify automatically.

### Manual Deployment

1. Set all required environment variables in your hosting platform
2. Push Convex env vars: `npx convex env set KEY value` for each server-side variable
3. Deploy Convex: `npx convex deploy`
4. Build and deploy frontend: `npm run build`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, Shadcn UI |
| Backend | Convex (real-time, serverless) |
| Auth | Convex Auth (password + Google OAuth) |
| Rich Text | Lexical |
| Email | Resend |
| SMS | Twilio |
| Payments | Stripe |
| File Import | Google Drive Picker API |
