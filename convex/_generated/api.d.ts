/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as content from "../content.js";
import type * as contentGroups from "../contentGroups.js";
import type * as contentShares from "../contentShares.js";
import type * as contentVersions from "../contentVersions.js";
import type * as generateThumbnail from "../generateThumbnail.js";
import type * as http from "../http.js";
import type * as inviteCodes from "../inviteCodes.js";
import type * as orders from "../orders.js";
import type * as presence from "../presence.js";
import type * as pricing from "../pricing.js";
import type * as publicContent from "../publicContent.js";
import type * as router from "../router.js";
import type * as userGroups from "../userGroups.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  content: typeof content;
  contentGroups: typeof contentGroups;
  contentShares: typeof contentShares;
  contentVersions: typeof contentVersions;
  generateThumbnail: typeof generateThumbnail;
  http: typeof http;
  inviteCodes: typeof inviteCodes;
  orders: typeof orders;
  presence: typeof presence;
  pricing: typeof pricing;
  publicContent: typeof publicContent;
  router: typeof router;
  userGroups: typeof userGroups;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
