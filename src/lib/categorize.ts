const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shopping: ["order", "purchase", "cart", "checkout", "delivery", "amazon", "shop", "store", "deal", "sale"],
  news: ["newsletter", "daily", "briefing", "weekly", "report", "alert", "update", "today", "headline"],
  finance: ["bank", "statement", "invoice", "receipt", "payment", "billing", "transaction", "subscription"],
  social: ["facebook", "twitter", "linkedin", "instagram", "notification", "follow", "connection", "invite"],
};

export function categorizeSender(senderName: string, senderEmail: string): string {
  const text = `${senderName} ${senderEmail}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "other";
}
