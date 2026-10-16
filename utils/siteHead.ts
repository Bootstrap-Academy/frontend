/**
 * What a search result or a shared link says about a page: its title and its description.
 * The German texts are what a search engine reads, because the interface is German unless a
 * visitor has chosen English. This file is also read while the site is built, so it holds
 * plain data and nothing of the app.
 */
export const SITE_NAME = "Bootstrap Academy";

/** A page's title: what it is about, then the name of the site. */
export const pageTitle = (subject: string) => `${subject} · ${SITE_NAME}`;

// What the site offers, in one sentence: the description of the course list and the first
// half of the start page's.
const offer = {
  de: "Deutschsprachige Kurse zu Programmierung, Linux, IT-Sicherheit und Informatik.",
  en: "German-language courses on programming, Linux, IT security and computer science.",
} as const;

export const siteHead = {
  de: {
    home: {
      title: "Bootstrap Academy: Programmieren und IT online lernen",
      description: `${offer.de} Die erste Übung startest du ohne Konto direkt im Browser.`,
    },
    courses: { title: pageTitle("Kurse"), description: offer.de },
    start: {
      title: "Python-Schleifen ausprobieren, ohne Konto · Bootstrap Academy",
      description:
        "Bewege eine Figur mit Anweisungen und Wiederholungen ans Ziel und sieh, wie daraus eine Python-Schleife wird.",
    },
  },
  en: {
    home: {
      title: "Bootstrap Academy: Learn programming and IT online",
      description: `${offer.en} You start the first exercise in your browser, without an account.`,
    },
    courses: { title: pageTitle("Courses"), description: offer.en },
    start: {
      title: "Try Python loops, without an account · Bootstrap Academy",
      description:
        "Move a figure to its target with instructions and repetitions and see how they become a Python loop.",
    },
  },
};

/** The pages whose built HTML carries their own German title and description. */
export const builtHeads: Record<string, { title: string; description: string }> = {
  "/start": siteHead.de.start,
  "/courses": siteHead.de.courses,
};

/**
 * A description for a search result out of a longer text: its beginning, cut at the end of a
 * word. Search engines show about 150 characters.
 */
export function shortDescription(text: string | null | undefined, limit = 155) {
  const plain = (text ?? "").replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit - 1);
  const end = cut.lastIndexOf(" ");
  return (end > limit / 2 ? cut.slice(0, end) : cut).replace(/[\s,;:–-]+$/, "") + "…";
}

/** The address of a page as search engines should know it: one form, with a trailing slash. */
export function canonicalUrl(web: string, path: string) {
  const clean = path.split(/[?#]/)[0] || "/";
  return web.replace(/\/+$/, "") + (clean.endsWith("/") ? clean : clean + "/");
}
