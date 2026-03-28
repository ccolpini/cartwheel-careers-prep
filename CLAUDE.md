# CLAUDE.md

## Project Overview

Cartwheel Career Prep — an AI-powered interview preparation portal for Cartwheel (K-12 mental health telehealth company). Candidates get role-specific guidance, AI chat support, interview roadmaps, checklists, and personal notes. Includes an admin dashboard for managing job roles.

## Tech Stack

- **Frontend**: React 18 + Vite 6
- **Styling**: Inline styles (color palette in `C` object in App.jsx)
- **Icons**: Lucide React
- **API**: Vercel Serverless Functions (Node.js)
- **AI**: Anthropic Claude API (proxied via `/api/chat`)
- **Analytics**: Google Sheets API (via `/api/track`) + Vercel Analytics
- **Deployment**: Vercel

## Project Structure

```
src/
  App.jsx         # Main component (~2200 lines) — all UI components and views
  main.jsx        # React entry point + Vercel Analytics
  roles.js        # Built-in job role data; shared constants (CARTWHEEL_STATS, CARTWHEEL_LINKS)
  logo.png        # Cartwheel logo
api/
  chat.js         # Vercel serverless: proxies to Anthropic Claude API
  track.js        # Vercel serverless: logs engagement events to Google Sheets
hooks/
  useCopilotTracking.ts  # React hook for firing engagement events (includes event type definitions)
```

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
```

## Environment Variables (set in Vercel, not in repo)

- `VITE_ANTHROPIC_API_KEY` — Claude API key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Google Service Account email
- `GOOGLE_PRIVATE_KEY` — Google private key
- `COPILOT_SHEET_ID` — Google Sheet ID for analytics

## Architecture Notes

- **CandidateView**: Tab-based UI (Overview, JD, Chat, Roadmap, Culture, Checklist, Notes). AI chat uses stage-aware system prompts. Notes and checklist state persisted in localStorage.
- **AdminDashboard**: Password-protected. Allows pasting hiring packages which Claude auto-parses into structured JSON. Roles saved to localStorage.
- **Routing**: Role selected via `?role=slug` query parameter. Roles come from `BUILT_IN_ROLES` (roles.js) merged with localStorage custom roles.
- **Tracking**: 6 event types (role_page_viewed, chat_opened, chat_message_sent, chat_session_ended, apply_clicked, role_page_exited) sent to Google Sheets with session/source metadata.

## Code Conventions

- Single-file component architecture (App.jsx contains all UI components)
- Inline styles with shared color palette object (`C`)
- localStorage for client-side persistence (notes, stages, custom roles)
- No TypeScript in frontend (JSX only); TypeScript used in hooks
- No test framework configured
- No linter/formatter configured
