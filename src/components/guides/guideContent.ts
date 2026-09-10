import type { TourStop } from "./GuidedTour";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/permissions";

export interface WrittenStep {
  title: string;
  detail: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  /** Which portal this guide is offered in. */
  audience: "admin" | "client";
  /**
   * When set, the guide is only offered to users holding this permission.
   * Prevents offering a workflow the user cannot perform — and, for guides
   * whose first tour stop targets a permission-gated nav item, prevents a
   * tour that spotlights nothing.
   */
  requiredPermission?: Permission;
  writtenSteps: WrittenStep[];
  tourStops: TourStop[];
}

export const GUIDES: Guide[] = [
  {
    id: "upload-content",
    title: "Create content (all the fields)",
    summary: "Add a video, audio file, document, image, or article — with what every field on the form means.",
    audience: "admin",
    tourStops: [
      {
        target: "tab-content",
        title: "Open Content",
        description: "Click Next and I'll open the Content tab — where all your content lives.",
        position: "right",
        action: "click",
      },
      {
        target: "create-content",
        title: "Open the form",
        description:
          "Next opens the 'Create New Content' form so we can walk through it together.",
        position: "bottom",
        action: "click",
      },
      {
        target: "field-title",
        title: "Title (required)",
        description:
          "Start with a clear title. It's the only required field, and it's the name people see everywhere.",
        position: "right",
      },
      {
        target: "field-description",
        title: "Description",
        description:
          "A rich-text editor for the write-up clients read — add headings, links, and formatting here. Optional but recommended.",
        position: "right",
      },
      {
        target: "field-type",
        title: "Attachment type",
        description:
          "Pick what kind of file this is — Video, Audio, Image, or PDF. The file picker just below changes to match.",
        position: "right",
      },
      {
        target: "field-file",
        title: "The file",
        description:
          "Upload the file here (or, for video/audio, paste an external link). Big files upload in chunks — give them a minute.",
        position: "right",
      },
      {
        target: "field-visibility",
        title: "Who can see it",
        description:
          "Tick this to make the content public (anyone with the link). Leave it off to keep it restricted to people you give access to.",
        position: "top",
      },
      {
        target: "field-save",
        title: "Save it",
        description:
          "When everything's filled in, this creates the content as a Draft. That's the whole flow — click Done and I'll tidy up.",
        position: "top",
      },
    ],
    writtenSteps: [
      {
        title: "Open the form",
        detail:
          "In the Content tab, click Add Content to open the 'Create New Content' form. The fields below appear top to bottom.",
      },
      {
        title: "Title (required)",
        detail:
          "The one required field, marked with a *. Use a clear name staff and clients will recognize — it's the headline shown everywhere the content appears.",
      },
      {
        title: "Description",
        detail:
          "A short summary of what the content is and who it's for. Shown to clients on the content page. Optional, but strongly recommended.",
      },
      {
        title: "Author Name",
        detail:
          "Who gets credit for the content. If you leave it blank it defaults to 'Neurological Music Therapy Services of Arizona'.",
      },
      {
        title: "Attachment Type (required)",
        detail:
          "Pick the kind of file: Video, Audio, Image, or PDF. Your choice changes the next field — e.g. Video shows a video file picker, Audio shows an audio picker.",
      },
      {
        title: "The file",
        detail:
          "Upload the file for the type you chose. Large files (over 500 MB) upload in chunks and can take several minutes — keep the tab open until it finishes. For video and audio you can paste an External URL instead of uploading (next field).",
      },
      {
        title: "External URL (optional)",
        detail:
          "Instead of uploading, you can point to a video or audio file already hosted somewhere else (for example YouTube) by pasting its link here.",
      },
      {
        title: "Very large files",
        detail:
          "Anything over 500 MB uploads in pieces so it doesn't time out. Two things to know: no thumbnail is made automatically for those, so add a picture yourself if you want one; and you can't swap a file that large from the Edit Content form afterwards.",
      },
      {
        title: "Tags",
        detail:
          "Keywords that help you and clients find and group content. Type a tag and press Enter to add each one.",
      },
      {
        title: "Importing from Google Drive",
        detail:
          "Each file field also offers a Google Drive button, which pulls a file straight from your Drive instead of your computer. If you don't see it, Drive hasn't been set up for this site — upload from your computer instead.",
      },
      {
        title: "Make this content public",
        detail:
          "Checked = anyone with the link can view it, once it is published. Unchecked = restricted, so only people you give access to can see it. If a client says they can't find something, see 'Why clients can't see it yet'.",
      },
      {
        title: "Availability — active vs. inactive",
        detail:
          "Under Availability Settings there's a 'Set content as in-active' box. Leave it unchecked to keep the content live. Check it to hide the content without deleting it — handy for things that aren't ready or are out of season.",
      },
      {
        title: "Start date (optional)",
        detail:
          "Schedule when the content becomes available. Before this date clients won't see it, even if it's published.",
      },
      {
        title: "End date (optional)",
        detail:
          "Schedule when the content expires. After this date it stops showing to clients.",
      },
      {
        title: "Password protection (optional)",
        detail:
          "If you have permission, you can set a password viewers must enter to open the content — on top of the other access rules above. Leave it blank for no password.",
      },
      {
        title: "Save",
        detail:
          "Click Save to create the content. You'll see a 'Content created successfully' confirmation. New content starts as a Draft — see the 'Content statuses & review' guide for what happens next.",
      },
    ],
  },
  {
    id: "share-content",
    title: "Share content",
    summary: "Send a piece of content to someone with a shareable link.",
    audience: "admin",
    tourStops: [
      {
        target: "tab-content",
        title: "Sharing lives on your content",
        description:
          "In real use you open a content item's ⋮ menu and choose Share with 3rd Party. Next, I'll show you with a safe example.",
        position: "right",
        action: "click",
      },
      {
        target: "demo-example",
        title: "An example item",
        description:
          "Here's an example content item — just for this tour, nothing is saved or emailed.",
        position: "top",
      },
      {
        target: "demo-open-share",
        title: "Open Share",
        description: "Next clicks Share to open the real dialog with this example.",
        position: "top",
        action: "click",
      },
      {
        target: "share-field-recipient",
        title: "Who you're sharing with",
        description:
          "Optionally add the recipient's email and a message. You can also set how long the link works.",
        position: "right",
      },
      {
        target: "share-field-save",
        title: "Create the link",
        description:
          "This generates a shareable link to send. (Off here — example only.) Your links live under the Shares tab. Click Done.",
        position: "top",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "In the left sidebar, click Content and find the item you want to share.",
      },
      {
        title: "Use the item's Share action",
        detail: "On the content row, open the ⋮ menu and choose Share with 3rd Party. This opens the share dialog.",
      },
      {
        title: "Enter the recipient",
        detail: "Add the recipient's email and an optional message explaining what you're sending.",
      },
      {
        title: "Copy the shareable link",
        detail:
          "The dialog generates a shareable link. Copy it and send it to the recipient however you like.",
      },
      {
        title: "Manage links under Shares",
        detail:
          "Open the Shares tab to see every link you've created. From there you can copy a link again or delete it to revoke access.",
      },
    ],
  },
  {
    id: "content-statuses",
    title: "Content statuses & review",
    summary: "Understand how content moves from a draft to published, and how the review step works.",
    audience: "admin",
    tourStops: [
      {
        target: "tab-content",
        title: "Where statuses live",
        description:
          "Open the Content tab. Every item shows a status label telling you where it is in the process.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "Where to see status",
        detail:
          "In the Content tab, each item shows a status label. It tells you whether the content is still being worked on, waiting on someone, or live for clients. There are five statuses, explained below.",
      },
      {
        title: "Draft",
        detail:
          "A brand-new or in-progress item. Visible only to staff — never to clients. Edit it as much as you like. A piece of content always starts here when you create it. When it's finished, submit it for review.",
      },
      {
        title: "How to submit for review",
        detail:
          "On the item's row, open the ⋮ actions menu and choose Submit for Review. This moves the item to 'In review' and hands it to a reviewer. Do this once the draft is complete.",
      },
      {
        title: "In review",
        detail:
          "The content is waiting for a reviewer (an editor or admin) to check it. There's nothing for the author to do at this stage — the reviewer will either approve and publish it, request changes, or reject it.",
      },
      {
        title: "Changes requested",
        detail:
          "The reviewer wants edits before it can go live. Open the item, read any notes the reviewer left, make the changes, and submit for review again. It then goes back to 'In review'.",
      },
      {
        title: "Published",
        detail:
          "Approved and live. Clients you've shared it with — or who purchased it — can now see it. A reviewer opens Review Content from the ⋮ menu and chooses Approve & Publish. Note: a published item still needs to be active and within any start/end dates to actually appear to clients.",
      },
      {
        title: "Rejected",
        detail:
          "The reviewer decided it shouldn't be published. It stays in your list but isn't live. You can edit it and submit again, or archive it if it's no longer needed.",
      },
      {
        title: "Who can do what",
        detail:
          "Contributors create drafts and submit them for review. Editors and admins do the reviewing — approving/publishing, requesting changes, or rejecting. Owners and admins can do everything.",
      },
    ],
  },
  {
    id: "pricing-store",
    title: "Pricing & the store",
    summary: "Put a price on content so clients can buy it in the Shop.",
    audience: "admin",
    requiredPermission: PERMISSIONS.SET_CONTENT_PRICING,
    tourStops: [
      {
        target: "tab-content",
        title: "Pricing lives on your content",
        description:
          "In real use you open a content item's ⋮ menu and choose Set Pricing. Next, I'll show you with a safe example.",
        position: "right",
        action: "click",
      },
      {
        target: "demo-example",
        title: "An example item",
        description:
          "Here's an example content item — just for this tour, nothing is saved. In real use this would be one of your own items.",
        position: "top",
      },
      {
        target: "demo-open-pricing",
        title: "Open Set Pricing",
        description: "Next clicks Set pricing to open the real dialog with this example.",
        position: "top",
        action: "click",
      },
      {
        target: "pricing-field-price",
        title: "Set the price",
        description:
          "Enter what customers pay to unlock this content. You can also choose how long their access lasts below.",
        position: "right",
      },
      {
        target: "pricing-field-save",
        title: "Save it",
        description:
          "Saving makes it buyable in the Shop. (The button is off here — this is just an example.) Click Done and I'll close the demo.",
        position: "top",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "Find the piece of content you want to sell.",
      },
      {
        title: "Open the item's actions menu",
        detail: "Click the ⋮ button at the end of the content's row and choose Set Pricing.",
      },
      {
        title: "Set the price",
        detail:
          "Enter the price and save. (Setting pricing needs the right permission — if you don't see Set Pricing, ask an admin.)",
      },
      {
        title: "It appears in the Shop",
        detail:
          "Priced content shows up in the client-facing Shop, where clients can request to buy it.",
      },
      {
        title: "Clients buy it",
        detail:
          "A client requests the content; once their purchase is completed they get access. You can review activity under the Orders and Purchases tabs.",
      },
    ],
  },
  {
    id: "create-bundle",
    title: "Create a bundle",
    summary: "Group several pieces of content into a bundle so they can be shared or sold together.",
    audience: "admin",
    requiredPermission: PERMISSIONS.MANAGE_CONTENT_GROUPS,
    tourStops: [
      {
        target: "tab-contentGroups",
        title: "Open Bundles",
        description: "Click Next to open the Bundles tab.",
        position: "right",
        action: "click",
      },
      {
        target: "create-bundle-btn",
        title: "Start a bundle",
        description: "Next opens the new-bundle form right here on the page.",
        position: "bottom",
        action: "click",
      },
      {
        target: "bundle-name",
        title: "Name the bundle",
        description:
          "Give the bundle a name (and an optional description), then add content to it and Save. That's it — click Done.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Bundles tab",
        detail: "In the sidebar, click Bundles.",
      },
      {
        title: "Create a new bundle",
        detail: "Click the create button and give the bundle a name (and a description if you like).",
      },
      {
        title: "Add content to it",
        detail: "Open the bundle and use Search available content... to find items, then tick the ones you want. That search matches titles, descriptions and tags — so if you tag consistently, one word pulls up everything that belongs together. Untick an item to take it back out.",
      },
      {
        title: "Save",
        detail:
          "The bundle is now available to share or price as a group, just like a single piece of content.",
      },
    ],
  },
  {
    id: "write-article",
    title: "Write an article",
    summary: "Add formatted text, headings, and links — written in a content item's rich-text Description.",
    audience: "admin",
    tourStops: [
      {
        target: "tab-content",
        title: "Start in Content",
        description: "Click Next to open the Content tab.",
        position: "right",
        action: "click",
      },
      {
        target: "create-content",
        title: "Open the form",
        description: "Next opens the create form, where the Description field is a full text editor.",
        position: "bottom",
        action: "click",
      },
      {
        target: "field-description",
        title: "The Description is the editor",
        description:
          "This is where an article's text goes. It's a full rich-text editor — headings, bold, lists, and links. There's no separate 'Article' type; formatted writing lives here.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "There's no separate 'Article' type",
        detail:
          "In this app you don't pick an 'Article' content type. Instead, every piece of content has a rich-text Description, and that's where a formatted write-up goes.",
      },
      {
        title: "Open the create (or edit) form",
        detail:
          "From the Content tab, click Add Content for new content — or open an existing item's ⋮ menu and choose Edit Content to add text to it.",
      },
      {
        title: "Add the required basics",
        detail:
          "Enter a Title and pick an Attachment Type (Video, Audio, Image, or PDF) with its file or link. These are still required even when the main value is the text.",
      },
      {
        title: "Write in the Description editor",
        detail:
          "Use the Description field's toolbar to add headings, bold/italic text, lists, and links. This formatted write-up is what clients read on the content's page.",
      },
      {
        title: "Save",
        detail:
          "Save the content. Your formatted text is stored with it and shown on its page. Like all content, it can go through review before it's published.",
      },
    ],
  },
  {
    id: "client-getting-around",
    title: "Getting around",
    summary: "A quick look at where everything lives in your portal.",
    audience: "client",
    tourStops: [
      {
        target: "client-nav-home",
        title: "Home",
        description:
          "Your starting point, with a quick look at the content available to you.",
        position: "bottom",
      },
      {
        target: "client-nav-browse",
        title: "Browse",
        description:
          "Search everything you have access to by typing part of its title.",
        position: "bottom",
      },
      {
        target: "client-nav-shop",
        title: "Shop",
        description:
          "Content you can buy. You ask for access first, and pay once a staff member approves it.",
        position: "bottom",
      },
      {
        target: "client-nav-profile",
        title: "You",
        description:
          "Your name and photo, switching between light and dark, and signing out. That's the tour — click Done.",
        position: "bottom",
      },
    ],
    writtenSteps: [
      {
        title: "Home",
        detail:
          "Where you land when you sign in. Shows a selection of the content available to you. Recommendations from your therapist are under For You.",
      },
      {
        title: "Browse",
        detail:
          "Everything you have access to, with a search box that matches titles.",
      },
      {
        title: "Shop",
        detail:
          "Content available to buy. See 'Getting access to paid content' for how buying works.",
      },
      {
        title: "For You",
        detail:
          "Recommendations picked for you by a therapist, each with a note about why. On a phone, tap More to find it.",
      },
      {
        title: "Orders and Requests",
        detail:
          "Orders holds what you've bought and your receipts; Requests tracks access you've asked for. On a phone, both are under More.",
      },
      {
        title: "Your profile",
        detail:
          "Tap your photo in the top right to change your name or picture, switch between light and dark, or sign out.",
      },
    ],
  },
  {
    id: "client-find-and-open",
    title: "Find something and open it",
    summary: "Search for content, open it, and get back again.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Start from Home or Browse",
        detail:
          "Home shows a selection of your content. Browse shows everything you have access to.",
      },
      {
        title: "Search for it",
        detail:
          "In Browse, type into the search box. It matches the title of each item, so try a word from the name of what you're looking for.",
      },
      {
        title: "Open an item",
        detail: "Tap or click anywhere on a content card to open it.",
      },
      {
        title: "Opening takes you out of the portal",
        detail:
          "Content opens in its own full-screen viewer, so the menus you were just using disappear. That's expected.",
      },
      {
        title: "Getting back",
        detail:
          "Use your browser's Back button, or the Home button in the top bar of the viewer, to return to the portal.",
      },
    ],
  },
  {
    id: "client-play-content",
    title: "Watch, listen, or read",
    summary: "How each kind of content opens, and how to download a copy.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Video",
        detail:
          "Plays in a player with the usual controls — play and pause, volume, and full screen.",
      },
      {
        title: "Audio",
        detail: "Plays in an audio bar with play, pause, and a position slider.",
      },
      {
        title: "Documents",
        detail:
          "Choose Open Document and the file opens in a new tab, where you can read it or save your own copy.",
      },
      {
        title: "Articles",
        detail: "Written content appears directly on the page — just scroll to read.",
      },
      {
        title: "If something asks for a password",
        detail:
          "Some shared items are protected. Enter the password whoever shared it gave you. If it asks you to sign in, use your usual account.",
      },
    ],
  },
  {
    id: "client-paid-access",
    title: "Getting access to paid content",
    summary: "Request it, wait for approval, then pay — and where to finish if you stop partway.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Find it in Shop",
        detail: "Paid content lives in Shop, each item showing its price.",
      },
      {
        title: "Request to purchase",
        detail:
          "Choose Request to Purchase. You can't buy immediately — a staff member reviews the request first.",
      },
      {
        title: "Wait for approval",
        detail:
          "Approval isn't instant and may take a day or two. You can check the status any time under Requests.",
      },
      {
        title: "Complete the purchase",
        detail:
          "Once approved, go back to Shop. The item now shows Request Approved with a Complete Purchase button — use that to pay.",
      },
      {
        title: "If you stop partway",
        detail:
          "An approved request stays approved until you use it, so you can come back and finish from Shop later. You can check its status any time under Requests.",
      },
      {
        title: "After buying",
        detail:
          "The content is yours to open from Browse. Some purchases include an access period — check Orders for the expiry date.",
      },
    ],
  },
  {
    id: "client-for-you",
    title: "For You: your therapist's recommendations",
    summary: "Content picked for you, and the note explaining why.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open For You",
        detail: "It's a tab along the top; on a phone, tap More first.",
      },
      {
        title: "Read the note",
        detail:
          "Each recommendation can carry a short message from whoever recommended it, explaining why it's relevant to you.",
      },
      {
        title: "Open the content",
        detail: "Choose the recommendation to open it, the same as anywhere else.",
      },
      {
        title: "If it's paid content",
        detail:
          "Recommended items that cost money follow the normal route — request access from Shop and pay once approved. See 'Getting access to paid content'.",
      },
    ],
  },
  {
    id: "client-orders",
    title: "Your orders and receipts",
    summary: "What you've bought, your receipts, and when access runs out.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open Orders",
        detail: "A tab along the top; on a phone, tap More first.",
      },
      {
        title: "Review an order",
        detail: "Each row shows what you bought, what it cost, and the date.",
      },
      {
        title: "Get a receipt",
        detail: "Use the receipt action on an order to download a copy for your records.",
      },
      {
        title: "Check access expiry",
        detail:
          "Some purchases grant access for a set period. Where that applies, the expiry date is shown on the order.",
      },
    ],
  },
  {
    id: "client-profile",
    title: "Your profile and appearance",
    summary: "Change your name or photo, switch light and dark, and sign out.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open your profile",
        detail: "Tap your photo in the top right corner.",
      },
      {
        title: "Change your name",
        detail: "Edit your first and last name, then save.",
      },
      {
        title: "Add or change your photo",
        detail: "Upload a picture, replace the one you have, or remove it entirely.",
      },
      {
        title: "Light or dark",
        detail:
          "The theme toggle beside your photo switches between light and dark. Your choice is remembered.",
      },
      {
        title: "Sign out",
        detail:
          "The sign-out button is next to your photo. Worth doing on a shared or family device.",
      },
    ],
  },
  {
    id: "client-recommend",
    title: "Recommending content to a client",
    summary: "Send a client a piece of content with a note about why.",
    audience: "client",
    requiredPermission: PERMISSIONS.RECOMMEND_CONTENT,
    tourStops: [],
    writtenSteps: [
      {
        title: "Open the content",
        detail: "Find the item you want to recommend and open it.",
      },
      {
        title: "Choose Recommend",
        detail:
          "The Recommend button appears on content you can recommend. Only professional accounts see it.",
      },
      {
        title: "Enter the recipient",
        detail: "Type the email address of the person you're recommending it to.",
      },
      {
        title: "Add a note",
        detail:
          "Include a short message explaining why you're sending it — this is what they'll read in their For You tab.",
      },
      {
        title: "Send it",
        detail: "Once sent, the recommendation appears in that person's For You tab.",
      },
    ],
  },
  {
    id: "organize-with-tags",
    title: "Tag content so you can find it again",
    summary: "Add tags as you go, keep them consistent, and use the tag filter to pull a set back out.",
    audience: "admin",
    tourStops: [],
    writtenSteps: [
      {
        title: "Where tags live",
        detail:
          "There's a Tags field on the Create New Content form and on Edit Content. The box reads 'Type a tag and press Enter...'.",
      },
      {
        title: "Add a tag",
        detail:
          "Type a word and press Enter. A comma or Tab adds it too, and so does clicking away from the box. Each tag becomes a small badge.",
      },
      {
        title: "Add several at once",
        detail:
          "Paste a comma-separated list — balance, gait, warm-up — and all of them are added together. This is the quickest way to tag something.",
      },
      {
        title: "Capital letters are removed for you",
        detail:
          "Tags are stored in lower case, so typing Autism saves autism. You never have to match capitals when you search later.",
      },
      {
        title: "Remove a tag",
        detail:
          "Click the × on a badge to take it off. Pressing Backspace in an empty box removes the last one you added.",
      },
      {
        title: "Change tags later",
        detail:
          "Open the ⋮ menu at the end of the item's row, choose Edit Content, and edit the Tags field the same way. Editing tags does not send the item back for review.",
      },
      {
        title: "Find things by tag",
        detail:
          "In the Content tab, the Filters panel has a Filter by Tags heading with a chip for every tag in use. Click chips to narrow the list, and use Clear at the top to reset everything.",
      },
      {
        title: "No tags yet? No filter yet",
        detail:
          "The Filter by Tags section only appears once at least one item has a tag. If you can't see it, nothing has been tagged.",
      },
      {
        title: "The search box does not search tags",
        detail:
          "Search Content matches titles and descriptions only. To find things by tag, use the chips instead. Two other places do search tags: the picker when you add content to a bundle, and the search in Archived.",
      },
      {
        title: "Agree on your words",
        detail:
          "A tag is just text, so warmup and warm-up are two separate chips holding different items. Agree a short list as a team and stick to it — that is what makes tags worth having.",
      },
      {
        title: "What clients see",
        detail:
          "Clients see an item's tags when they open it, but they have no way to search or filter by them. Tags are for finding things yourself.",
      },
    ],
  },
];

/**
 * The guides a given user should be offered. Single filtering point for both
 * portals — consumers must never read GUIDES directly.
 */
export function getGuidesFor(
  audience: Guide["audience"],
  permissions: string[] | undefined,
): Guide[] {
  return GUIDES.filter(
    (g) =>
      g.audience === audience &&
      (g.requiredPermission === undefined ||
        hasPermission(permissions, g.requiredPermission)),
  );
}
