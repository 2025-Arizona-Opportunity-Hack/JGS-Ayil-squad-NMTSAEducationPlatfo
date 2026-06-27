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
        title: "Sharing lives on your content",
        description:
          "In real use you open a content item's ⋯ menu and choose Share. Next, I'll show you with a safe example.",
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
        title: "Pricing lives on your content",
        description:
          "In real use you open a content item's ⋯ menu and choose Set pricing. Next, I'll show you with a safe example.",
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
    summary: "Add formatted text, headings, and links — written in a content item's rich-text Description.",
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
          "From the Content tab, click Create Content for new content — or open an existing item's ⋯ menu and choose Edit to add text to it.",
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
];
