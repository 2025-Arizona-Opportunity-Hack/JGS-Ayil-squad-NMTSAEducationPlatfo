import { useEffect } from "react";
import { stripHtml } from "@/lib/sanitize";

function upsertMeta(attr: "name" | "property", key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
}

/**
 * Client-side page metadata for the SPA: document.title + description for
 * human visitors and JS-rendering crawlers (Google). Unfurl bots never see
 * this — they get server-rendered tags from api/meta.ts via the vercel.json
 * bot rewrite.
 */
export function usePageMeta(options: {
  title?: string | null;
  description?: string | null;
  noindex?: boolean;
}) {
  const { title, description, noindex } = options;

  useEffect(() => {
    if (title) {
      document.title = title;
      upsertMeta("property", "og:title", title);
    }
    if (description) {
      const plain = stripHtml(description).slice(0, 200);
      if (plain) {
        upsertMeta("name", "description", plain);
        upsertMeta("property", "og:description", plain);
      }
    }
    if (noindex) {
      upsertMeta("name", "robots", "noindex");
    }
  }, [title, description, noindex]);
}
