import type { TourStop } from "./GuidedTour";

export interface WrittenStep {
  title: string;
  detail: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  writtenSteps: WrittenStep[];
  tourStops: TourStop[];
}

export const GUIDES: Guide[] = [
  {
    id: "upload-content",
    title: "Create content (all the fields)",
    summary: "Add a video, audio file, document, image, or article — with what every field on the form means.",
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
        target: "field-type",
        title: "Attachment type",
        description:
          "Pick what kind of file this is — Video, Audio, Image, or PDF. The file picker just below changes to match.",
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
          "In the Content tab, click Create Content to open the 'Create New Content' form. The fields below appear top to bottom.",
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
          "Pick the kind of content: Video, Audio, Image, PDF, or Article (rich text). Your choice changes the next field — e.g. Video shows a video file picker, while Article opens a text editor (see the 'Write an article' guide).",
      },
      {
        title: "The file",
        detail:
          "For Video / Audio / Image / PDF, upload the file here. Large files (over 500 MB) upload in chunks and can take several minutes — keep the tab open until it finishes. Articles have no file; you type the content in the editor instead.",
      },
      {
        title: "External URL (optional)",
        detail:
          "Instead of uploading, you can point to a video or audio file already hosted somewhere else (for example YouTube) by pasting its link here.",
      },
      {
        title: "Tags",
        detail:
          "Keywords that help you and clients find and group content. Type a tag and press Enter to add each one.",
      },
      {
        title: "Make this content public",
        detail:
          "Checked = anyone with the link can view it. Unchecked = restricted, so only people you give access to (through sharing, a recommendation, or a purchase) can see it.",
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
    tourStops: [
      {
        target: "tab-content",
        title: "Find your content",
        description: "Open the Content tab and locate the item you want to share.",
        position: "right",
      },
      {
        target: "tab-shareLinks",
        title: "Manage share links",
        description:
          "Every link you create appears under the Shares tab, where you can copy or revoke it anytime.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "In the left sidebar, click Content and find the item you want to share.",
      },
      {
        title: "Use the item's Share action",
        detail: "On the content row, choose Share. This opens the share dialog.",
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
          "On the item's row, open the ⋯ actions menu and choose Submit for review. This moves the item to 'In review' and hands it to a reviewer. Do this once the draft is complete.",
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
          "Approved and live. Clients you've shared it with — or who purchased it — can now see it. Reviewers publish from the ⋯ menu via Approve / Publish. Note: a published item still needs to be active and within any start/end dates to actually appear to clients.",
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
    tourStops: [
      {
        target: "tab-content",
        title: "Pricing starts here",
        description: "Open the Content tab and find the item you want to sell.",
        position: "right",
      },
      {
        target: "tab-orders",
        title: "Track sales",
        description: "Completed purchases show up under the Orders tab.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "Find the piece of content you want to sell.",
      },
      {
        title: "Open the item's actions menu",
        detail: "Click the ⋯ button on the content's row and choose Set pricing.",
      },
      {
        title: "Set the price",
        detail:
          "Enter the price and save. (Setting pricing needs the right permission — if you don't see Set pricing, ask an admin.)",
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
    tourStops: [
      {
        target: "tab-contentGroups",
        title: "Bundles live here",
        description: "Open the Bundles tab to see and create bundles.",
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
        detail: "Choose which existing pieces of content belong in this bundle.",
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
    summary: "Create text-based content with the built-in editor instead of uploading a file.",
    tourStops: [
      {
        target: "tab-content",
        title: "Start in Content",
        description: "Open the Content tab.",
        position: "right",
      },
      {
        target: "create-content",
        title: "Create Content",
        description: "Click Create Content, then choose the Article type to write with the editor.",
        position: "bottom",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab and click Create Content",
        detail: "This opens the same form you use to upload files.",
      },
      {
        title: "Choose the Article type",
        detail:
          "In the create form, pick Article (rich text) as the content type. This opens a text editor instead of a file picker.",
      },
      {
        title: "Give it a title",
        detail: "Use a clear title staff and clients will recognize.",
      },
      {
        title: "Write your content",
        detail:
          "Use the editor to add text, headings, links, and formatting. There's no file to upload for an article.",
      },
      {
        title: "Set visibility and save",
        detail:
          "Choose who can see it and click Save. Like other content, an article can go through review before it's published.",
      },
    ],
  },
];
