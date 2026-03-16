// app/api/track/route.ts
// Copilot engagement event logger → Google Sheets
// Drop this in your Next.js app/api/track/ directory

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// ─── Event Types ────────────────────────────────────────────────────────────
export type CopilotEventName =
  | "role_page_viewed"       // candidate landed on a role page
  | "chat_opened"            // candidate expanded/opened the AI chat
  | "chat_message_sent"      // candidate sent their first message
  | "chat_session_ended"     // candidate closed chat or navigated away
  | "apply_clicked"          // candidate clicked apply CTA
  | "role_page_exited";      // candidate left role page (bounce)

export interface CopilotEvent {
  event: CopilotEventName;
  roleId: string;             // e.g. "rev-ops-analyst" or Gem req ID
  roleTitle: string;          // human-readable, e.g. "Revenue Operations Analyst"
  roleFamily: string;         // e.g. "Finance", "Clinical", "Engineering"
  sessionId: string;          // random UUID generated client-side per session
  durationSeconds?: number;   // for chat_session_ended and role_page_exited
  messageCount?: number;      // for chat_session_ended
  source?: string;            // referrer, e.g. "linkedin", "email", "direct"
  timestamp?: string;         // ISO string — auto-set if omitted
}

// ─── Auth ────────────────────────────────────────────────────────────────────
// Set these in your Vercel environment variables:
// GOOGLE_SERVICE_ACCOUNT_EMAIL
// GOOGLE_PRIVATE_KEY          (keep the \n escapes — Vercel handles them)
// COPILOT_SHEET_ID            (the long ID from your Google Sheet URL)

function getAuthClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth;
}

// ─── Sheet Writer ─────────────────────────────────────────────────────────────
async function appendToSheet(event: CopilotEvent) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    event.timestamp ?? new Date().toISOString(),
    event.event,
    event.roleId,
    event.roleTitle,
    event.roleFamily,
    event.sessionId,
    event.durationSeconds ?? "",
    event.messageCount ?? "",
    event.source ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.COPILOT_SHEET_ID,
    range: "Events!A:I",          // sheet tab named "Events"
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: CopilotEvent = await req.json();

    // Basic validation
    if (!body.event || !body.roleId || !body.sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: event, roleId, sessionId" },
        { status: 400 }
      );
    }

    await appendToSheet(body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/track] error:", err);
    // Return 200 so client-side tracking never breaks the user experience
    return NextResponse.json({ ok: false, swallowed: true });
  }
}

// Always return 200 on OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
