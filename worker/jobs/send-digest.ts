import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { getConnection } from "../../src/lib/queue";

new Worker(
  "send-digest",
  async (job) => {
    const { digestId, userId } = job.data as { digestId: string; userId: string };
    const digest = await prisma.digest.findUniqueOrThrow({ where: { id: digestId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const emails = (digest.emails as { sender: string; email: string }[]) || [];
    const html = `
      <h2>Your Unsub Digest</h2>
      <p>${emails.length} emails rolled up:</p>
      <ul>${emails.map((e) => `<li><strong>${e.sender}</strong> (${e.email})</li>`).join("")}</ul>
    `;

    const accounts = await prisma.account.findMany({
      where: { userId, active: true },
    });

    for (const account of accounts) {
      if (account.provider === "google") {
        const { google } = await import("googleapis");
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: account.accessToken! });
        const gmail = google.gmail({ version: "v1", auth });
        const raw = Buffer.from(
          `To: ${user.email}\r\nSubject: Unsub Digest\r\nMIME-Version: 1.0\r\nContent-Type: text/html\r\n\r\n${html}`
        ).toString("base64url");
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      }
    }
  },
  { connection: getConnection(), concurrency: 3 }
);
