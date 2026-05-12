export async function unsubscribeViaHttp(url: string, postData?: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: postData ? "POST" : "GET",
      headers: postData ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
      body: postData || undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeViaMailto(
  mailto: string,
  accessToken: string,
  provider: string
): Promise<boolean> {
  try {
    const emailAddr = mailto.replace("mailto:", "").split("?")[0];
    if (provider === "google") {
      const { google } = await import("googleapis");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth });
      const raw = Buffer.from(
        `To: ${emailAddr}\r\nSubject: Unsubscribe\r\n\r\nUnsubscribe`
      ).toString("base64url");
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
