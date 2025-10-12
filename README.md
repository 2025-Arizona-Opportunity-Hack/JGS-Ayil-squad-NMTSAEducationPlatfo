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

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
