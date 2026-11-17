/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authGate from "../authGate.js";
import type * as authStoreGuard from "../authStoreGuard.js";
import type * as clientInvites from "../clientInvites.js";
import type * as content from "../content.js";
import type * as contentGroups from "../contentGroups.js";
import type * as contentShares from "../contentShares.js";
import type * as debug from "../debug.js";
import type * as debugActions from "../debugActions.js";
import type * as emails from "../emails.js";
import type * as featureFlags from "../featureFlags.js";
import type * as generateThumbnail from "../generateThumbnail.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as inviteCodes from "../inviteCodes.js";
import type * as joinRequests from "../joinRequests.js";
import type * as notificationLogs from "../notificationLogs.js";
import type * as notificationSettings from "../notificationSettings.js";
import type * as orders from "../orders.js";
import type * as permissions from "../permissions.js";
import type * as pricing from "../pricing.js";
import type * as publicContent from "../publicContent.js";
import type * as purchaseRequests from "../purchaseRequests.js";
import type * as recommendations from "../recommendations.js";
import type * as router from "../router.js";
import type * as setup from "../setup.js";
import type * as siteSettings from "../siteSettings.js";
import type * as sms from "../sms.js";
import type * as stripe from "../stripe.js";
import type * as stripe_helpers from "../stripe_helpers.js";
import type * as uploadLogs from "../uploadLogs.js";
import type * as userGroups from "../userGroups.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  authGate: typeof authGate;
  authStoreGuard: typeof authStoreGuard;
  clientInvites: typeof clientInvites;
  content: typeof content;
  contentGroups: typeof contentGroups;
  contentShares: typeof contentShares;
  debug: typeof debug;
  debugActions: typeof debugActions;
  emails: typeof emails;
  featureFlags: typeof featureFlags;
  generateThumbnail: typeof generateThumbnail;
  helpers: typeof helpers;
  http: typeof http;
  inviteCodes: typeof inviteCodes;
  joinRequests: typeof joinRequests;
  notificationLogs: typeof notificationLogs;
  notificationSettings: typeof notificationSettings;
  orders: typeof orders;
  permissions: typeof permissions;
  pricing: typeof pricing;
  publicContent: typeof publicContent;
  purchaseRequests: typeof purchaseRequests;
  recommendations: typeof recommendations;
  router: typeof router;
  setup: typeof setup;
  siteSettings: typeof siteSettings;
  sms: typeof sms;
  stripe: typeof stripe;
  stripe_helpers: typeof stripe_helpers;
  uploadLogs: typeof uploadLogs;
  userGroups: typeof userGroups;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  twilio: import("@convex-dev/twilio/_generated/component.js").ComponentApi<"twilio">;
};
