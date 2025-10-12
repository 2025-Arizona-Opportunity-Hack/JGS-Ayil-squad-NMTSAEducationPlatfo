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
import type * as auth from "../auth.js";
import type * as content from "../content.js";
import type * as contentGroups from "../contentGroups.js";
import type * as contentVersions from "../contentVersions.js";
import type * as http from "../http.js";
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
  auth: typeof auth;
  content: typeof content;
  contentGroups: typeof contentGroups;
  contentVersions: typeof contentVersions;
  http: typeof http;
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
