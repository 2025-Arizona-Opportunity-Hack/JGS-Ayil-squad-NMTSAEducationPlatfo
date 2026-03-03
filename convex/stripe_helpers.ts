import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Get order details for creating a Stripe Checkout Session
export const getOrderDetails = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    let contentTitle: string | undefined;
    let contentDescription: string | undefined;

    if (order.contentId) {
      const content = await ctx.db.get(order.contentId);
      contentTitle = content?.title;
      contentDescription = content?.description;
    }

    return {
      ...order,
      contentTitle,
      contentDescription,
    };
  },
});

// Save Stripe session ID on an order
export const setStripeSessionId = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
    });
  },
});
