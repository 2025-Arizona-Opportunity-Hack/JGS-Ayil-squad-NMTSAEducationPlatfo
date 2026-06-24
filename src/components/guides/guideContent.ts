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
];
