const UNSUBSCRIBE_REGEX = /unsubscribe|opt.?out|cancel.?subscription/i;
const NEWSLETTER_DOMAINS = ["mail.", "newsletter.", "e.", "info.", "marketing."];

export function hasListUnsubscribeHeader(headers: Record<string, string>): boolean {
  return !!headers["list-unsubscribe"];
}

export function parseListUnsubscribe(headers: Record<string, string>): {
  url?: string;
  mailto?: string;
  httpPost?: string;
} {
  const raw = headers["list-unsubscribe"] || "";
  const result: { url?: string; mailto?: string; httpPost?: string } = {};

  const links = raw.split(",").map((s) => s.trim());
  for (const link of links) {
    const clean = link.replace(/^<|>$/g, "");
    if (clean.startsWith("mailto:")) result.mailto = clean;
    else if (clean.startsWith("http")) result.url = clean;
  }

  const postRaw = headers["list-unsubscribe-post"];
  if (postRaw) result.httpPost = postRaw;

  return result;
}

export function findUnsubscribeLinkInBody(body: string): string | null {
  const lines = body.split("\n");
  for (const line of lines) {
    if (UNSUBSCRIBE_REGEX.test(line)) {
      const match = line.match(/href=["'](https?:\/\/[^"']+)["']/i);
      if (match) return match[1];
    }
  }
  return null;
}

export function isLikelyNewsletter(
  senderEmail: string,
  headers: Record<string, string>,
  emailCountInWeek: number
): boolean {
  if (hasListUnsubscribeHeader(headers)) return true;
  const domain = senderEmail.split("@")[1] || "";
  if (NEWSLETTER_DOMAINS.some((prefix) => domain.startsWith(prefix))) return true;
  if (emailCountInWeek >= 3) return true;
  return false;
}
