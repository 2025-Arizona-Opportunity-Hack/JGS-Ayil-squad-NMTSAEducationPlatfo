# NMTSA Content Platform Documentation

Welcome to the Neurological Music Therapy Services of Arizona (NMTSA) Content Platform. This guide covers everything you need to know about using and managing the platform effectively.

## What Is This Platform?

The NMTSA Content Platform is a learning management system designed for sharing educational content related to neurological music therapy. It combines content hosting, access management, and e-commerce features to create a comprehensive solution for therapists, clients, parents, and healthcare professionals.

## Core Capabilities

The platform provides several key functions:

- **Content Management**: Upload and organize videos, articles, documents, and audio files
- **Access Control**: Manage who can view specific content through multiple permission methods
- **Content Groups**: Bundle related materials together for easier distribution
- **Analytics**: Track views, engagement, and sales performance
- **E-Commerce**: Sell content with flexible pricing and access duration options
- **Collaboration**: Review and approve content before publication
- **Recommendations**: Share specific resources with clients or colleagues

## User Roles

The platform uses role-based access control to determine what each user can do.

### Administrative Roles

**Owner**

- Full system access and control
- Cannot be removed by other users
- Typically the person who initially set up the platform
- Can manage all users, content, and system settings

**Admin**

- Nearly identical permissions to Owner
- Can manage users, content, groups, and view analytics
- Cannot remove the Owner
- Can generate invite codes for new users

**Editor**

- Creates and publishes content directly
- Reviews and approves content from Contributors
- Manages content groups and access permissions
- Has oversight of the content workflow

**Contributor**

- Creates content and submits it for review
- Cannot publish without Editor or Admin approval
- Suitable for team members who create materials but need oversight

### Client Roles

**Client**

- Accesses educational materials based on granted permissions
- Can purchase content from the shop
- Views content analytics for their own usage

**Parent**

- Similar permissions to Client
- Typically accesses content on behalf of a family member
- Same purchasing and viewing capabilities

**Professional**

- Healthcare professionals or therapy colleagues
- Can recommend specific content to other users
- May have access to specialized professional materials

## Content Management

### Creating Content

When creating new content, you can configure:

- Title and detailed description
- Content type (video, article, document, or audio)
- File upload or external URL
- Rich text body content
- Tags for improved searchability
- Public or private visibility
- Availability dates (when content becomes available and expires)
- Publishing status

### Content Workflow

Content moves through defined states:

**Draft** - Work in progress, visible only to the creator

**Review** - Submitted for editorial approval (Contributors use this state)

**Published** - Live and accessible to users with appropriate permissions

**Rejected or Changes Requested** - Returned to creator for revision

### Version Control

The platform maintains a complete history of content changes. Every edit creates a new version, preserving the previous state. This allows you to review what changed, when it changed, and who made the change. You can restore any previous version if needed.

## Access Management

There are three methods for granting content access:

### Individual Access

Grant specific users permission to view specific content. This works well for one-off sharing or personalized access.

### User Groups

Create groups of users (such as "Q1 2025 Workshop Participants" or "Professional Network"), then grant the entire group access at once. This is more efficient than managing individual permissions when dealing with multiple users.

### Role-Based Access

Make content available to all users with a particular role. For example, you can grant access to all Clients or all Professionals in one action.

### Content Groups

Content groups allow you to bundle related materials together. After creating a group, you can grant access to the entire collection at once rather than managing permissions for each piece individually. This also helps with organization and content discovery.

## Sharing Features

### Share Links

Create secure, shareable links for people outside the platform. When creating a share link:

- Enter the recipient's email address
- Add an optional message
- Set an expiration date (optional)
- Add password protection for sensitive content (optional)

The system automatically emails the link to the recipient. You can track view counts and last access times for each shared link.

### Content Recommendations

Professionals can recommend specific content to clients or colleagues. This feature allows you to:

- Select content to recommend
- Specify the recipient's email
- Include a personalized message
- Track whether the recommendation was viewed

This is particularly useful for creating personalized therapy or learning plans.

## Shop and Pricing

The platform includes e-commerce functionality for selling content access.

To set up pricing:

- Specify a price for the content
- Choose between permanent access or time-limited access
- Activate the pricing to make content available in the shop

Users can browse the shop, purchase content, and manage their orders through their order history. The system includes a mock payment processor for development and testing.

Administrators can view all orders, process refunds, and access sales analytics.

## Analytics

The analytics system tracks:

- **Content Views**: Total views and unique viewers per content item
- **Live Presence**: Real-time view tracking showing who is currently viewing content
- **Sales Data**: Revenue, popular items, and customer behavior
- **User Engagement**: Time spent on content and user activity patterns

These metrics help you understand what content resonates with your audience and identify opportunities for improvement.

## Getting Started

### Initial Setup

1. Sign in using email/password or Google authentication
2. Select your role (new users only)
3. Complete your profile with your name and profile picture
4. Navigate to your dashboard (content varies by role)

### Admin Dashboard

The admin interface includes several main sections:

**Content Tab**
Manage all content—upload new materials, edit existing items, configure pricing, and view content-specific analytics.

**Share Links Tab**
View and manage all external share links, including creation, expiration, and access tracking.

**Content Groups Tab**
Create and manage content collections, add or remove items, and control group access permissions.

**Users Tab**
View all platform users, modify roles, and manage account status.

**User Groups Tab**
Create user groups, manage membership, and assign content access.

**Analytics Tab**
Access sales performance data, engagement metrics, and revenue reports.

**Orders Tab**
Review all purchases, process refunds, and export order data.

### Client Dashboard

The client interface focuses on content consumption:

**Browse & Search**
Search for content by title or keywords, filter by type, and view recommended content.

**Shop**
Browse available content for purchase, view pricing and access duration information.

**Order History**
Review past purchases, track access expiration, and download receipts.

**Content Viewer**
Access and view your available content (videos, articles, documents, audio).

## Common Workflows

### Uploading Content

1. Navigate to the Content tab
2. Click "Add Content"
3. Fill in the required information (title, description, type)
4. Upload a file or provide an external URL
5. Add tags for searchability
6. Set visibility (public or private)
7. Choose status (draft, review, or published)
8. Save the content

### Granting Access

1. Locate the content in the Content tab
2. Click the access management icon
3. Choose your access method:
   - Add individual users
   - Select user groups
   - Enable role-based access
4. Set an expiration date if needed
5. Configure sharing permissions
6. Save changes

### Creating Share Links

1. Go to the Share Links tab
2. Click "Create Share Link"
3. Select the content to share
4. Enter recipient email and optional message
5. Set expiration date (optional)
6. Add password protection if needed
7. Create the link (automatically sent to recipient)

### Setting Content Pricing

1. Find your content in the Content tab
2. Click the pricing icon
3. Enter the price
4. Specify access duration (leave blank for permanent access)
5. Activate the pricing
6. Content now appears in the shop

### Inviting Users

Admins can generate invite codes:

1. Click "Generate Invite Code"
2. Select the role for the new user
3. Set an expiration date (optional)
4. Copy and share the code
5. New users enter the code during registration

### Recommending Content

For professionals:

1. Locate the content to recommend
2. Click the recommend icon
3. Enter the recipient's email
4. Write a message explaining the recommendation
5. Send (recipient receives email notification)

## Technical Setup

### Prerequisites

This platform requires a Convex backend. Before running locally, you need either:

- Access to the existing Convex deployment (requires being added as a collaborator), or
- Your own Convex deployment

### Setting Up Convex

To create your own deployment:

1. Create an account at [convex.dev](https://convex.dev)
2. Run `npx convex dev` in the project directory
3. Follow the prompts to create or link a project

### Running Locally

Install dependencies:

```bash
npm install
```

Start the development servers:

```bash
npm run dev
```

This command starts both the Vite frontend server and the Convex backend simultaneously.

The application will open in your browser at `http://localhost:5173`.

Note: The first run with a new Convex deployment will push the database schema and backend functions to Convex. This process takes 1-2 minutes.

### Environment Variables

For Google authentication, create a `.env.local` file:

```
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

These credentials require OAuth setup in Google Cloud Console. The platform works without them using email/password authentication.

### Authentication Methods

The platform supports three authentication methods:

- **Email/Password**: Standard account creation, available by default
- **Google OAuth**: Requires environment variable configuration
- **Anonymous**: Testing only, not recommended for production

### Backend Architecture

Convex handles:

- Database storage and queries
- Real-time data synchronization
- User authentication
- File storage
- HTTP API endpoints

All data updates propagate to connected clients in real-time without requiring page refreshes.

## Feature Details

### Rich Text Editor

The article editor supports:

- Text formatting (bold, italic, headings)
- Bulleted and numbered lists
- Hyperlinks to external resources
- Code blocks for technical content

The editor uses Lexical, providing a familiar writing experience similar to other modern content platforms.

### Video Thumbnails

Uploaded videos receive automatically generated thumbnails. You can replace the automatic thumbnail with a custom image if desired.

### Password Protection

Share links can include password protection. Recipients must enter the correct password before viewing the content. This adds a security layer for sensitive materials.

### Content Status Badges

The interface displays visual indicators for content state:

- Publishing status (Draft, Review, Published)
- Visibility (Public or Private)
- Availability (Active or Inactive)
- Pricing status (Available for Purchase)

### Live Presence

Real-time tracking shows which users are currently viewing specific content. This information is useful for understanding engagement patterns and coordinating team activities.

## Best Practices

### Content Organization

Use descriptive, specific titles that clearly indicate the content topic. Add relevant tags to each piece of content—this significantly improves searchability later. Organize related content into logical groups based on topics, time periods, or skill levels. Take advantage of availability dates to schedule content releases automatically.

### User Management

User groups are substantially more efficient than individual permissions when managing access for multiple users. Conduct periodic access audits to ensure permissions remain appropriate. Use expiration dates for time-limited access situations, such as course enrollments or trial periods. Verify that users have roles matching their actual responsibilities.

### Content Workflow

Maintain separation between content creation and publication when possible. The review process helps maintain quality standards. Remember that version control allows you to edit published content without risk—you can always revert to a previous version if needed. Regular review of analytics helps identify which content is most effective with your audience.

### Content Sharing

Share links provide better control and tracking than downloading and emailing files. Use password protection for any sensitive content. Set appropriate expiration dates rather than allowing links to remain active indefinitely. Monitor whether shared content is actually being viewed—this information can inform your sharing strategy.

## Troubleshooting

### Content Not Visible After Upload

Check the publishing status—content in Draft state is not visible to others. Verify that the content is marked as Active in the availability settings. Confirm that you have the necessary permissions to view the content.

### User Cannot Access Content

Verify that access has been granted through one of the three methods (individual, group, or role). Confirm the user's role assignment is correct. Check whether access has expired. Ensure the content is published and active.

### Share Link Not Working

Verify the link has not expired. If password-protected, confirm the correct password is being used. Check that the content remains active and available. Ensure the complete link was copied without truncation.

### Missing Analytics Data

Analytics update in near real-time but may have slight delays. Confirm that the content has been viewed at least once. Check that date range filters are set correctly.

## Frequently Asked Questions

**What file types are supported?**
Videos (MP4), documents (PDF), audio files, and images are directly supported. For other formats, use external URLs to hosted files.

**Are there file size limitations?**
File size limits depend on your Convex plan. Standard content files upload without issues.

**Can published content be edited?**
Yes. All edits create new versions automatically while preserving the original.

**What happens when access expires?**
Users lose viewing access. You can extend access at any time.

**How are refunds processed?**
Admins can change order status to "refunded" in the Orders tab.

**How is content deleted?**
Use the delete icon in the Content tab. Deletion is permanent and cannot be undone.

**Can clients share content they access?**
Only if the "Can Share" permission was enabled when granting access.

**Do share links expire automatically?**
Links expire based on the expiration date set during creation. Without an expiration date, links remain valid indefinitely.

## Additional Resources

For general usage questions, refer to this documentation. For technical issues, check the troubleshooting section. For backend-specific questions, consult the Convex documentation at [docs.convex.dev](https://docs.convex.dev/).

### Technology Stack

- **React**: Frontend framework
- **Convex**: Backend platform
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling framework
- **Shadcn UI**: Component library
- **Lexical**: Rich text editor

---

## Summary

This platform streamlines the sharing and management of neurological music therapy educational content. The interface is designed to be clear and functional, with features that scale from individual use to team collaboration.

Key takeaways:

Start with core features before exploring advanced functionality. The version control system protects against mistakes, allowing you to experiment safely. Strong organizational practices from the beginning save time later. User groups significantly simplify access management. Analytics provide valuable insights into content effectiveness and user engagement.
