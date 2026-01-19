📖 **[View Full Documentation](https://github.com/2025-Arizona-Opportunity-Hack/JGS-Ayil-squad-NMTSAEducationPlatfo/blob/main/DOCUMENTATION.md)**

# Learning Management System for Neurological Music Therapy

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).

This project is connected to the Convex deployment named [`savory-dalmatian-243`](https://dashboard.convex.dev/d/savory-dalmatian-243).

## Project structure

The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App authentication

This app uses [Convex Auth](https://auth.convex.dev/) with multiple authentication providers:

- **Password authentication** - Email/password sign-in
- **Google OAuth** - Sign in with Google account
- **Anonymous auth** - For easy testing

### Setting up Authentication

Before using authentication, you must set up the JWT private key for signing tokens:

```bash
npm run setup:auth
```

This generates a secure RSA key pair and sets both required environment variables in your Convex deployment:
- `JWT_PRIVATE_KEY` - Private key for signing JWTs
- `JWKS` - Public key in JSON Web Key Set format for verification

### Setting up Google OAuth

To enable Google sign-in, you need to:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable APIs**:
   - Enable the "Google Identity" API or "Google+ API"

3. **Create OAuth Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: `https://savory-dalmatian-243.convex.site/api/auth/callback/google`
     - Local Development: `http://localhost:5174/api/auth/callback/google`
     - Production: `https://your-domain.com/api/auth/callback/google`

4. **Set Environment Variables**:
   - Create a `.env.local` file in the project root
   - Add your Google OAuth credentials:
     ```
     AUTH_GOOGLE_ID=your_google_client_id_here
     AUTH_GOOGLE_SECRET=your_google_client_secret_here
     ```

5. **Restart the development server** after adding the environment variables.

### ✅ Google OAuth Status

Google OAuth is now **ENABLED** and ready to use! Make sure your `.env.local` file contains:

```
AUTH_GOOGLE_ID=your_actual_google_client_id
AUTH_GOOGLE_SECRET=your_actual_google_client_secret
```

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

- If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
- Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
- Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Google Drive Integration

The app supports importing files directly from Google Drive. This requires setting up Google Cloud credentials.

### Setting up Google Drive Picker (Full Guide)

Follow these steps to enable Google Drive file imports:

#### Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. If you don't have a Google account, create one at [accounts.google.com](https://accounts.google.com)
3. Sign in to Google Cloud Console
4. Accept the Terms of Service if prompted

#### Step 2: Create a New Google Cloud Project

1. Click the project dropdown at the top of the page (next to "Google Cloud")
2. Click **"New Project"** in the top right of the modal
3. Enter a project name (e.g., "NMTSA Education Platform")
4. Select your organization (or leave as "No organization")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the project dropdown

#### Step 3: Enable Required APIs

You need to enable two APIs:

1. **Enable Google Drive API**:
   - Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
   - Search for "Google Drive API"
   - Click on it, then click **"Enable"**

2. **Enable Google Picker API**:
   - Go back to the API Library
   - Search for "Google Picker API"
   - Click on it, then click **"Enable"**

#### Step 4: Configure OAuth Consent Screen

Before creating credentials, you must configure the OAuth consent screen:

1. Go to [APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **"External"** user type (unless you have Google Workspace, then choose "Internal")
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: Your app name (e.g., "NMTSA Education Platform")
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **Scopes** page:
   - Click **"Add or Remove Scopes"**
   - Find and select `https://www.googleapis.com/auth/drive.readonly`
   - Click **"Update"**
   - Click **"Save and Continue"**
7. On the **Test users** page (for External apps in testing mode):
   - Click **"Add Users"**
   - Add email addresses of users who will test the app
   - Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

> **Note**: For production, you'll need to submit your app for verification by Google. Until then, only test users can use Google Drive integration.

#### Step 5: Create OAuth 2.0 Credentials

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Select **"Web application"** as the application type
4. Enter a name (e.g., "NMTSA Web Client")
5. Under **"Authorized JavaScript origins"**, add:
   - For development: `http://localhost:5173`
   - For production: `https://your-production-domain.com`
6. Under **"Authorized redirect URIs"**, add:
   - For development: `http://localhost:5173`
   - For production: `https://your-production-domain.com`
7. Click **"Create"**
8. Copy the **Client ID** (you'll need this)

#### Step 6: Create an API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** > **"API key"**
3. Copy the API key
4. **Restrict the API key** (recommended for production):
   - Click on the API key to edit it
   - Under **"Application restrictions"**, select **"HTTP referrers"**
   - Add your domains:
     - `http://localhost:5173/*` (for development)
     - `https://your-production-domain.com/*` (for production)
   - Under **"API restrictions"**, select **"Restrict key"**
   - Select only **"Google Drive API"** and **"Google Picker API"**
   - Click **"Save"**

#### Step 7: Get Your Project Number (App ID)

1. Go to [Project Settings](https://console.cloud.google.com/iam-admin/settings)
2. Find the **"Project number"** (a numeric ID like `929206318915`)
3. This is your App ID for the picker

#### Step 8: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Google Drive Picker Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_APP_ID=your-project-number
```

Replace:
- `your-client-id.apps.googleusercontent.com` with the OAuth Client ID from Step 5
- `your-api-key` with the API Key from Step 6
- `your-project-number` with the Project Number from Step 7

#### Step 9: Restart and Test

1. Restart your development server: `npm run dev`
2. Go to Content Manager and click "Add Content"
3. Select a file type (Video, Audio, Image, or PDF)
4. Click **"Import from Google Drive"**
5. Sign in with a test user account (if in testing mode)
6. Select a file and it should be imported

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Google Drive integration is not configured" | Check that all three env vars are set in `.env.local` |
| "Access blocked: App is in testing mode" | Add your Google account as a test user in OAuth consent screen |
| Picker opens but can't select files | Verify Google Drive API and Picker API are both enabled |
| CORS errors | Ensure your domain is in Authorized JavaScript origins |
| "idpiframe_initialization_failed" | Clear browser cache or try incognito mode |

### Production Deployment

For production, remember to:

1. **Verify your OAuth consent screen** with Google (required for external users)
2. **Update Authorized JavaScript origins** with your production domain
3. **Restrict your API key** to only your production domain
4. **Set environment variables** in your production environment (e.g., Vercel, Netlify)

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
