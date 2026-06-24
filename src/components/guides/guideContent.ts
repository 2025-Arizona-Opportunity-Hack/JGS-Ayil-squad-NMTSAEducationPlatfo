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
    title: "Upload content",
    summary: "Add a new video, document, audio file, or article to the library.",
    tourStops: [
      {
        target: "tab-content",
        title: "Open Content",
        description: "Everything you upload lives under the Content tab. Click here to open it.",
        position: "right",
      },
      {
        target: "create-content",
        title: "Create Content",
        description:
          "Click Create Content to open the upload form, then follow the written steps to fill it in.",
        position: "bottom",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "In the left sidebar, click Content. This is where all uploaded content lives.",
      },
      {
        title: "Click Create Content",
        detail: "Use the Create Content button at the top of the content list to open the upload form.",
      },
      {
        title: "Enter a title",
        detail: "Give the content a clear title that staff and clients will recognize.",
      },
      {
        title: "Choose the type and upload the file",
        detail:
          "Pick the content type (video, audio, document, or article) and select the file. Large files (over 500 MB) upload in chunks and can take a few minutes — keep the tab open until it finishes.",
      },
      {
        title: "Set visibility",
        detail:
          "Choose who can see it. Public content is visible to anyone with the link; otherwise it stays restricted.",
      },
      {
        title: "Save",
        detail:
          "Click Save. You'll see a 'Content created successfully' confirmation and the item appears in the list.",
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
        title: "Each item has a status",
        detail:
          "In the Content tab, every piece of content shows a status: Draft, In review, Changes requested, Published, or Rejected. The status tells you what (if anything) needs to happen next.",
      },
      {
        title: "Draft = work in progress",
        detail:
          "A draft is only visible to staff — it isn't live for clients yet. Keep editing until it's ready to be reviewed.",
      },
      {
        title: "Submit for review",
        detail:
          "When a draft is ready, open the item's actions menu (the ⋯ button on its row) and choose Submit for review. This hands it to a reviewer.",
      },
      {
        title: "In review",
        detail:
          "The item now waits for a reviewer (an editor or admin) to check it. You don't need to do anything while it's in review.",
      },
      {
        title: "Changes requested",
        detail:
          "If the reviewer wants edits, the status becomes Changes requested. Open the item, make the changes, and submit it for review again.",
      },
      {
        title: "Published = live",
        detail:
          "Once approved and published, the content is live for the people you share it with. Reviewers publish from the same ⋯ actions menu using Approve / Publish.",
      },
      {
        title: "Rejected",
        detail:
          "If content isn't a fit, a reviewer may reject it. It stays in the list but won't be published — you can edit and resubmit, or archive it.",
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
