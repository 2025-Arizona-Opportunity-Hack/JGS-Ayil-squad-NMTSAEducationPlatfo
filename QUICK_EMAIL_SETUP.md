# Quick Email Setup (5 minutes)

Your email verification system is **already working**! You just need to set up a free email service.

## Option 1: EmailJS (Recommended - Completely Free)

### Step 1: Create EmailJS Account

1. Go to [emailjs.com](https://www.emailjs.com/)
2. Sign up for free (no credit card required)
3. Create a new service (choose Gmail, Outlook, or any email provider)

### Step 2: Create Email Template

1. Go to "Email Templates" in EmailJS dashboard
2. Create new template with these variables:

   ```
   Subject: Verify your email - NMTSA Platform

   Hi there!

   Your verification code is: {{verification_code}}

   This code expires in 10 minutes.

   If you didn't request this, please ignore this email.
   ```

### Step 3: Get Your Keys

1. Copy your **Service ID**
2. Copy your **Template ID**
3. Copy your **Public Key** from Account settings

### Step 4: Add Environment Variables

Create a `.env.local` file in your project root:

```
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
```

### Step 5: Deploy to Convex

```bash
npx convex env set EMAILJS_SERVICE_ID service_xxxxxxx
npx convex env set EMAILJS_TEMPLATE_ID template_xxxxxxx
npx convex env set EMAILJS_PUBLIC_KEY xxxxxxxxxxxxxxx
```

## Option 2: Resend (Also Free Tier)

If you prefer Resend:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Replace the fetch call in `convex/emailVerification.ts` with:

```typescript
const emailResponse = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "noreply@yourdomain.com",
    to: email,
    subject: "Verify your email - NMTSA Platform",
    html: `
      <h2>Verify your email address</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
  }),
});
```

## That's It!

Your email verification system will now send real emails. The UI, database, and all logic are already working perfectly.

## Testing

1. Try signing up with a non-Gmail email
2. Check your email for the verification code
3. Enter the code to complete signup

If emails don't arrive, check your spam folder first!
