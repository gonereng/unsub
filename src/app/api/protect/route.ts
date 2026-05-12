import { NextResponse } from "next/server";

const PROTECTED_KEYWORDS = [
  "receipt", "invoice", "payment", "bank", "flight",
  "booking", "confirmation", "statement", "billing", "ticket", "order",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const email = searchParams.get("email") || "";
  const text = `${name} ${email}`.toLowerCase();
  const isProtected = PROTECTED_KEYWORDS.some((kw) => text.includes(kw));
  return NextResponse.json({ protected: isProtected });
}
