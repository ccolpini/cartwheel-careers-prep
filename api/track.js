import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { event, roleId, roleTitle, roleFamily, sessionId, durationSeconds, messageCount, source } = req.body;

  if (!event || !roleId || !sessionId) {
    return res.status(400).json({ error: "Missing required fields: event, roleId, sessionId" });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      new Date().toISOString(),
      event,
      roleId,
      roleTitle ?? "",
      roleFamily ?? "",
      sessionId,
      durationSeconds ?? "",
      messageCount ?? "",
      source ?? "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.COPILOT_SHEET_ID,
      range: "Events!A:I",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[/api/track] error:", error);
    // Return 200 so tracking never breaks the candidate experience
    res.status(200).json({ ok: false, swallowed: true });
  }
}
