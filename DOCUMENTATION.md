# NMTSA Content Platform Documentation

Welcome to the Neurological Music Therapy Services of Arizona (NMTSA) Content Platform. This guide covers everything you need to know about using and managing the platform.

## What Is This Platform?

The NMTSA Content Platform is a learning management system designed for sharing educational content related to neurological music therapy. It combines content hosting, access management, and e-commerce features to create a comprehensive solution for therapists, clients, parents, and healthcare professionals.

## Core Capabilities

- **Content Management**: Upload and organize videos, articles, documents, and audio files
- **Access Control**: Manage who can view specific content through individual, role-based, or group permissions
- **Content Groups**: Bundle related materials together for easier distribution
- **Analytics**: Track views, engagement, and sales performance
- **E-Commerce**: Sell content with flexible pricing and access duration options
- **Collaboration**: Review and approve content before publication
- **Recommendations**: Share specific resources with clients or colleagues
- **Notifications**: Per-event email and SMS routing with admin-configurable settings
- **Theming**: Light and dark mode with automatic preference detection

## Initial Setup

### Interactive Setup (Recommended)

Run the setup command and follow the prompts:

```bash
npm install
npm run setup
```

The CLI wizard guides you through configuring:

1. **Convex backend** - Your deployment URL (required)
2. **Auth keys** - JWT signing keys for authentication
3. **Email (Resend)** - API key and sending domain for email notifications
4. **SMS (Twilio)** - Account SID, auth token, and phone number for SMS notifications
5. **Stripe** - Secret key and webhook secret for payment processing
6. **Google Drive** - Client ID and secret for file import

You'll choose between development and production configuration. The script writes the appropriate `.env.local` or `.env.production.local` file, and optionally pushes server-side variables to Convex, Vercel, or Netlify.

### First-Time App Setup (Setup Wizard)

When the platform is launched for the first time (no users exist), a browser-based setup wizard appears:

1. **Welcome & Sign In** - Create the owner account. The first user is automatically assigned the owner role.
2. **Profile Setup** - Enter your name and optionally upload a profile picture.
3. **Organization Setup** - Configure your organization name, tagline, logo, brand color, and default notification preferences (which events send email/SMS).
4. **Complete** - The wizard creates the owner profile, site settings, and notification configuration in a single atomic transaction.

A **setup lock** prevents multiple people from running the wizard simultaneously. If someone else is already setting up, you'll see a waiting screen that automatically refreshes when they finish.

### Onboarding Tour

After setup completes, an onboarding tour highlights key areas of the admin dashboard:

- Content management sidebar
- User management sidebar
- Invite client button
- System settings sidebar
- Dark mode toggle

The tour supports keyboard navigation (arrow keys, Escape) and can be restarted from Site Settings at any time.

## User Roles

### Administrative Roles

**Owner**
- Full system access and control
- Cannot be removed by other users
- Created during initial setup

**Admin**
- Nearly identical permissions to Owner
- Can manage users, content, groups, and view analytics
- Cannot remove the Owner
- Can generate invite codes for new users

**Editor**
- Creates and publishes content directly
- Reviews and approves content from Contributors
- Manages content groups and access permissions

**Contributor**
- Creates content and submits it for review
- Cannot publish without Editor or Admin approval

### Client Roles

**Client**
- Accesses educational materials based on granted permissions
- Can purchase content from the shop

**Parent**
- Similar permissions to Client
- Typically accesses content on behalf of a family member

**Professional**
- Healthcare professionals or therapy colleagues
- Can recommend specific content to other users

## Content Management

### Creating Content

When creating new content, you can configure:

- Title and detailed description
- Content type (video, article, document, or audio)
- File upload, Google Drive import, or external URL
- Rich text body content (Lexical editor with formatting, lists, links, code blocks)
- Tags for improved searchability
- Public or private visibility
- Availability dates
- Publishing status

### Google Drive Import

If Google Drive credentials are configured (`VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CLIENT_ID`), an "Import from Google Drive" button appears next to the file upload input for each content type. If credentials are not set, the button is hidden entirely.

The import flow:
1. Click "Import from Google Drive"
2. Authenticate with your Google account (first time only)
3. Browse and select a file from your Drive
4. The file is downloaded and attached to the content form

Setup requires enabling Google Drive API and Google Picker API in Google Cloud Console. See [README.md](README.md) for setup steps.

### Content Workflow

Content moves through defined states:

- **Draft** - Work in progress, visible only to the creator
- **Review** - Submitted for editorial approval (Contributors use this)
- **Published** - Live and accessible to users with appropriate permissions
- **Rejected / Changes Requested** - Returned to creator for revision

### Version Control

Every edit creates a new version, preserving the previous state. You can review what changed, when, and who made the change. Previous versions can be restored at any time.

## Access Management

Three methods for granting content access:

### Individual Access

Grant specific users permission to view specific content. Options include:
- Expiration date
- Sharing permission (whether the user can share with others)

### User Groups

Create groups of users (e.g., "Q1 2025 Workshop Participants"), then grant the entire group access at once.

### Role-Based Access

Make content available to all users with a particular role in one action.

### Content Groups

Bundle related materials together. After creating a group, grant access to the entire collection rather than managing permissions individually.

## User Invitation

### Join Requests

Users without an invite code can request access:

1. User fills out the join request form (name, email, reason)
2. A verification email is sent to confirm their address (requires Resend)
3. User clicks the verification link in their email
4. The request appears in the admin dashboard for review
5. Admin approves or denies the request
6. If approved, the user receives notification and can sign up

### Admin/Editor Invite Codes

Admins can generate invite codes that assign specific roles:

1. Go to the Users section and click "Generate Invite Code"
2. Select the role (admin, editor, contributor)
3. Optionally set an expiration date
4. Share the code or generated invite link
5. New users enter the code during sign-up to receive that role automatically

Codes can be deactivated and reactivated at any time.

### Client Invitations

A dedicated flow for inviting clients, parents, and professionals:

1. Click "Invite Client" in the admin dashboard
2. Select the role (client, parent, professional)
3. Choose delivery method: email, SMS, or both
4. Enter contact info and an optional personal message
5. Set an expiration date if desired
6. Send the invitation

The invitation history tab shows all sent invitations with their status (active, used, expired) and allows resending or deactivating.

## Sharing Features

### Share Links

Create secure, shareable links for people outside the platform:

- Enter the recipient's email address
- Add an optional message
- Set an expiration date (optional)
- Add password protection for sensitive content (optional)

The system emails the link to the recipient. You can track view counts and last access times.

### Content Recommendations

Professionals can recommend content to clients or colleagues:

- Select content to recommend
- Specify the recipient's email
- Include a personalized message
- Track whether the recommendation was viewed

## Shop and Pricing

The platform includes e-commerce functionality for selling content access.

To set up pricing:
1. Find your content in the Content tab
2. Click the pricing icon
3. Enter the price
4. Choose between permanent or time-limited access
5. Activate the pricing

Users browse the shop, purchase content, and view order history. Admins can view all orders, process refunds, and access sales analytics.

Payment processing uses Stripe when configured.

## Notifications

### Configuration

Notification settings are managed in **Site Settings > Notification Settings**. Admins can:

- Enable/disable email and SMS independently for each event type
- See which channels are configured (based on environment variables)
- Refresh channel detection status

### Supported Events

| Event | Description |
|-------|-------------|
| Content Access Granted | User receives access to new content |
| Purchase Approved | Content purchase is confirmed |
| Purchase Denied | Content purchase is rejected |
| Recommendation | Professional recommends content to a user |
| Join Request Approved | User's join request is approved |
| Email Verification | Verification email for join requests |

### Channel Requirements

- **Email**: Requires `RESEND_API_KEY` environment variable
- **SMS**: Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`

When a channel's credentials are not configured, its toggles are disabled in the settings UI and the channel badge shows as "Not Configured."

## Theming

The platform supports light and dark mode:

- Toggle via the sun/moon button in the navbar
- System preference is detected automatically on first visit
- User's choice is persisted in local storage
- All UI components adapt to the selected theme

The theme system uses CSS custom properties defined in `src/index.css` with Tailwind utility classes. Admin brand colors (set during setup or in Site Settings) are separate from the theme and apply consistently in both modes.

## Analytics

The analytics system tracks:

- **Content Views**: Total views and unique viewers per content item
- **Live Presence**: Real-time view tracking showing who is currently viewing content
- **Sales Data**: Revenue, popular items, and customer behavior
- **User Engagement**: Time spent on content and activity patterns

## Admin Dashboard

The admin interface includes these main sections:

| Section | Purpose |
|---------|---------|
| **Content** | Upload, edit, configure pricing, view analytics |
| **Share Links** | Create and manage external share links |
| **Content Groups** | Bundle content and manage group access |
| **Users** | View users, modify roles, manage accounts |
| **User Groups** | Create groups and assign content access |
| **Analytics** | Sales performance, engagement, revenue |
| **Orders** | Review purchases, process refunds |
| **Site Settings** | Organization info, branding, notification preferences, onboarding tour restart |

## Client Dashboard

The client interface focuses on content consumption:

- **Browse & Search** - Search by title/keywords, filter by type
- **Shop** - Browse purchasable content
- **Order History** - Past purchases and access status
- **Content Viewer** - View videos, articles, documents, and audio

## Common Workflows

### Uploading Content

1. Navigate to the Content tab
2. Click "Add Content"
3. Fill in title, description, and type
4. Upload a file, import from Google Drive, or provide an external URL
5. Add tags for searchability
6. Set visibility and availability
7. Choose status (draft, review, or published)
8. Save

### Granting Access

1. Locate the content in the Content tab
2. Click the access management icon
3. Choose method: individual users, user groups, or role-based
4. Set expiration and sharing permissions
5. Save

### Creating Share Links

1. Go to the Share Links tab
2. Click "Create Share Link"
3. Select content, enter recipient email
4. Set expiration and password (optional)
5. Create the link (automatically emailed)

### Setting Content Pricing

1. Find content in the Content tab
2. Click the pricing icon
3. Enter price and access duration
4. Activate pricing (content appears in shop)

## Technical Details

### Backend Architecture

Convex provides:
- Database storage with real-time subscriptions
- Serverless functions (queries, mutations, actions)
- User authentication
- File storage
- Scheduled jobs (e.g., notification channel detection refresh)
- HTTP API endpoints

All data updates propagate to connected clients in real-time.

### Environment Variables

Server-side variables (Convex environment):
- `RESEND_API_KEY`, `RESEND_DOMAIN` - Email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payments
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` - Google OAuth

Client-side variables (`.env.local`, prefixed with `VITE_`):
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID` - Google Drive

See `.env.example` for the full template.

### Google Drive Setup (Detailed)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable **Google Drive API** and **Google Picker API** in APIs & Services > Library
3. Configure the OAuth consent screen:
   - User type: External (or Internal for Google Workspace)
   - Add scope: `https://www.googleapis.com/auth/drive.readonly`
   - Add test users (required while app is in testing mode)
4. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Authorized JavaScript origins: `http://localhost:5173` (dev), your production domain
   - Copy the Client ID
5. Create an API key:
   - Restrict to HTTP referrers (your domains)
   - Restrict to Google Drive API and Google Picker API
6. Get your project number from Project Settings
7. Set in `.env.local`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your-api-key
   VITE_GOOGLE_APP_ID=your-project-number
   ```

| Issue | Solution |
|-------|----------|
| No "Import from Google Drive" button | `VITE_GOOGLE_API_KEY` or `VITE_GOOGLE_CLIENT_ID` not set |
| "Access blocked: App is in testing mode" | Add your Google account as a test user |
| Picker opens but can't select files | Verify both APIs are enabled |
| CORS errors | Add your domain to Authorized JavaScript origins |

### Production Deployment

1. Run `npm run setup` and select "Production"
2. The script writes `.env.production.local` and can push variables to Convex/Vercel/Netlify
3. For Google Drive in production: verify your OAuth consent screen with Google, update authorized origins, and restrict your API key

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

## Troubleshooting

### Content Not Visible After Upload

Check publishing status (Draft is not visible to others). Verify the content is Active. Confirm the user has access permissions.

### User Cannot Access Content

Verify access has been granted (individual, group, or role). Check the user's role assignment. Look for expired access.

### Share Link Not Working

Verify the link hasn't expired. Check the password if protected. Ensure the content is still active.

### Notifications Not Sending

Check that the appropriate channel credentials are set in your environment. Verify the event is enabled in Site Settings > Notification Settings. Use the channel status refresh button to re-detect configuration.

### Setup Wizard Shows Lock Screen

Another user is currently running the setup wizard. The lock expires after 10 minutes. The screen auto-refreshes when the lock is released.
