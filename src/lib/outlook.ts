export async function graphRequest(
  accessToken: string,
  endpoint: string,
  options?: RequestInit
) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listMessages(
  accessToken: string,
  filter?: string,
  skip?: number
) {
  let endpoint = "/me/messages?$top=100&$select=id,subject,from,receivedDateTime,body";
  if (filter) endpoint += `&$filter=${encodeURIComponent(filter)}`;
  if (skip) endpoint += `&$skip=${skip}`;
  return graphRequest(accessToken, endpoint);
}

export async function getMessage(accessToken: string, messageId: string) {
  return graphRequest(accessToken, `/me/messages/${messageId}`);
}

export async function createRule(accessToken: string, from: string) {
  return graphRequest(accessToken, "/me/mailFolders/inbox/messages", {
    method: "POST",
    body: JSON.stringify({ /* rule creation */ }),
  });
}
