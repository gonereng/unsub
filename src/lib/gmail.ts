import { google } from "googleapis";

export function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function listMessages(
  gmail: ReturnType<typeof createGmailClient>,
  query: string,
  pageToken?: string
) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    pageToken,
    maxResults: 100,
  });
  return {
    messages: res.data.messages || [],
    nextPageToken: res.data.nextPageToken || undefined,
  };
}

export async function getMessage(
  gmail: ReturnType<typeof createGmailClient>,
  messageId: string
) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return res.data;
}

export function extractHeaders(payload: { headers?: { name?: string | null; value?: string | null }[] }) {
  const headers: Record<string, string> = {};
  for (const h of payload.headers || []) {
    if (h.name) headers[h.name.toLowerCase()] = h.value || "";
  }
  return headers;
}

export async function createFilter(
  gmail: ReturnType<typeof createGmailClient>,
  from: string
) {
  await gmail.users.settings.filters.create({
    userId: "me",
    requestBody: {
      criteria: { from },
      action: { addLabelIds: ["TRASH"] },
    },
  });
}

export async function createLabel(
  gmail: ReturnType<typeof createGmailClient>,
  name: string
) {
  const res = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    },
  });
  return res.data.id!;
}

export async function moveToLabel(
  gmail: ReturnType<typeof createGmailClient>,
  messageId: string,
  labelId: string
) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
      removeLabelIds: ["INBOX"],
    },
  });
}
