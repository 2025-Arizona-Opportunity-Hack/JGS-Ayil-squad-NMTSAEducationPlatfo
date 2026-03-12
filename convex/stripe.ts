"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

// Create a Stripe Checkout Session (called from HTTP action)
export const createCheckoutSessionAction = internalAction({
  args: {
    orderId: v.string(),
    amount: v.number(),
    currency: v.string(),
    contentTitle: v.string(),
    contentDescription: v.optional(v.string()),
    contentId: v.string(),
    userId: v.string(),
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe();
    const siteUrl = process.env.SITE_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: args.currency.toLowerCase(),
            product_data: {
              name: args.contentTitle,
              description: args.contentDescription || undefined,
            },
            unit_amount: args.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      metadata: {
        orderId: args.orderId,
        contentId: args.contentId,
        userId: args.userId,
      },
    });

    return { sessionId: session.id, url: session.url };
  },
});

// Verify Stripe webhook signature and extract event (called from HTTP action)
export const verifyWebhookAction = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is not configured. " +
        "Webhook signature verification is required for security. " +
        "Set STRIPE_WEBHOOK_SECRET in your Convex environment variables."
      );
    }

    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: event.type,
        orderId: session.metadata?.orderId,
        sessionId: session.id,
      };
    }

    return { type: event.type, orderId: undefined, sessionId: undefined };
  },
});
