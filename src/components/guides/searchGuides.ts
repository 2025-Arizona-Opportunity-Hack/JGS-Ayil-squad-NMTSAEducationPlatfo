import type { Guide } from "./guideContent";

export interface GuideMatch {
  guide: Guide;
  /**
   * The written step that matched, when nothing more visible did. Shown under
   * the guide so a searcher can see why a guide whose title doesn't mention
   * their word turned up.
   */
  matchedStep?: string;
}

/**
 * Words that carry no meaning in a help search. People often type a whole
 * question ("how do I watch a video"), and requiring "how" or "do" to appear in
 * a guide would hide the guide that answers it.
 */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "cant", "do", "does", "doesnt", "dont",
  "for", "how", "i", "if", "im", "in", "is", "isnt", "it", "its", "me", "my",
  "of", "on", "or", "the", "to", "what", "when", "where", "why", "with", "you",
  "your",
]);

// Heaviest first: a word in a guide's title says more about the guide than the
// same word in one step's detail.
const WEIGHTS = { title: 5, keywords: 4, summary: 3, stepTitle: 2, stepDetail: 1 };

function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // "can't" becomes one word, not "can" plus a stray "t" that would match
    // every word beginning with t.
    .replace(/['\u2019]/g, "")
    .toLowerCase();
}

/**
 * Trims a common English ending so "videos" finds "video" and "buying" finds
 * "buy". Short words are left alone — "is" and "bus" have no ending to drop.
 */
function stem(term: string): string {
  if (term.length <= 4) return term;
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (term.endsWith(suffix)) return term.slice(0, -suffix.length);
  }
  return term;
}

function termsOf(query: string): string[] {
  const words = normalise(query).split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((w) => !STOP_WORDS.has(w));
  return [...new Set(meaningful.map(stem))];
}

/** Matches at the start of a word, so "art" finds "article" but not "start". */
function containsWord(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${term}`).test(text);
}

/**
 * Filters and orders guides for the Help & Guides search box.
 *
 * Forgiving by design: a guide is kept if it matches any meaningful word, and
 * guides matching more of the words rank first. Many of the people using this
 * are typing a half-remembered word, or describing a task in their own terms,
 * and an empty result is a dead end for them. A blank query, or one made only
 * of words like "how do I", lists every guide in its usual order.
 */
export function searchGuides(guides: Guide[], query: string): GuideMatch[] {
  const terms = termsOf(query);
  if (terms.length === 0) return guides.map((guide) => ({ guide }));

  const scored = guides.map((guide, index) => {
    const steps = [
      ...guide.writtenSteps.map((s) => ({ title: s.title, detail: s.detail })),
      ...guide.tourStops.map((s) => ({ title: s.title, detail: s.description })),
    ].map((s) => ({ title: s.title, nTitle: normalise(s.title), nDetail: normalise(s.detail) }));

    const fields = [
      { text: normalise(guide.title), weight: WEIGHTS.title },
      { text: normalise((guide.keywords ?? []).join(" ")), weight: WEIGHTS.keywords },
      { text: normalise(guide.summary), weight: WEIGHTS.summary },
    ];

    let matchedTerms = 0;
    let weight = 0;
    let matchedVisibly = false;
    let matchedStep: string | undefined;

    for (const term of terms) {
      const best = fields.find((f) => containsWord(f.text, term));
      // Keywords are hidden, so a keyword hit alone still leaves the searcher
      // without a visible reason; only title and summary explain themselves.
      if (best && best.weight !== WEIGHTS.keywords) {
        matchedTerms++;
        weight += best.weight;
        matchedVisibly = true;
        continue;
      }
      const step =
        steps.find((s) => containsWord(s.nTitle, term)) ??
        steps.find((s) => containsWord(s.nDetail, term));
      if (step) matchedStep ??= step.title;
      if (best) {
        matchedTerms++;
        weight += best.weight;
      } else if (step) {
        matchedTerms++;
        weight += containsWord(step.nTitle, term) ? WEIGHTS.stepTitle : WEIGHTS.stepDetail;
      }
    }

    return {
      match: { guide, matchedStep: matchedVisibly ? undefined : matchedStep },
      matchedTerms,
      weight,
      index,
    };
  });

  return scored
    .filter((s) => s.matchedTerms > 0)
    .sort(
      (a, b) =>
        b.matchedTerms - a.matchedTerms || b.weight - a.weight || a.index - b.index,
    )
    .map((s) => s.match);
}
