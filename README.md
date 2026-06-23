# KoloSpeak Coach

KoloSpeak Coach is a private Next.js MVP for pronunciation, reading confidence, and speaking clarity practice. It is built for Hostinger Node.js Web App hosting and keeps OpenAI keys server-side.

## What The App Does

- Private email + passcode screen before app access.
- Single-user allowlist defaults to `hello@leonctyes.com`.
- Required baseline assessment before lessons.
- Dashboard with daily practice, streak, completed sessions, weak sounds, and baseline status.
- Adaptive local lesson selection using baseline weak sounds, low scores, speed, skipped words, and final consonant issues.
- Daily lesson flow: warm-up, sound of the day, listen, repeat, record, feedback, try again, save progress.
- Starter lessons focused on TH, R/L, V/B, short I/long E, final consonants, word stress, and sentence rhythm.
- Reading habit flow: choose, hear, read silently, speak aloud, explain, and save.
- Reading preferences for topics, custom topic, level, length, 1-minute mode, favorite passages, and reading goal.
- Local progress tracking for scores, streaks, completed lessons, weak sounds, missed words, skipped words, endings, speed, reading accuracy, and before-after comparison.
- AI usage control panel with calls today, last AI feature used, cost-saving mode, and high-quality voice toggle.
- Browser text-to-speech by default.
- Optional OpenAI high-quality voice button with server-side caching.
- OpenAI speech-to-text only after the user submits a recording.
- OpenAI feedback only after transcription.

## OpenAI Usage Controls

OpenAI is not called on page load, dashboard view, lesson page, reading page, reminders, or progress page.

OpenAI is used only for:

- Speech-to-text after Submit.
- AI feedback after transcription.
- Optional high-quality voice when the HQ voice button is clicked.
- Baseline or progress assessment after Submit.

Adaptive coaching uses local rules first. The app chooses the next lesson from saved progress before using any AI recommendation system.

Cost controls included:

- Local lesson data first.
- Browser speech synthesis is the default free voice.
- OpenAI TTS is optional and cached in `.cache/tts`.
- Cached OpenAI audio is returned before rate limit counting.
- Recordings are user-submitted only.
- Compact JSON prompts.
- `gpt-4o-mini` for routine feedback and reports.
- `gpt-4o-mini-transcribe` for transcription.
- Basic client usage counters in localStorage.
- Basic AI usage event log in localStorage.
- Basic server-side in-memory rate limiting.
- Allowed email and API passcode required for all OpenAI routes.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
CLEARSPEAK_PASSCODE=choose_a_private_one_time_passcode
ALLOWED_EMAILS=hello@leonctyes.com
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`, enter `hello@leonctyes.com`, and enter the passcode from `.env.local`.

## Build Check

```bash
npm run build
npm audit --omit=dev
```

## Hostinger Node.js Web App Deployment

This project is for Hostinger Node.js Web App hosting.

No VPS. No WordPress.

Target subdomain:

```text
clearspeak.leonctyes.com
```

1. In Hostinger, create a Node.js Web App for `clearspeak.leonctyes.com`.
2. Set these environment variables in Hostinger:

```bash
OPENAI_API_KEY=your_openai_api_key_here
CLEARSPEAK_PASSCODE=choose_a_private_one_time_passcode
ALLOWED_EMAILS=hello@leonctyes.com
```

3. Build locally:

```bash
npm install
npm run build
```

4. ZIP the project folder after the build. Include:

- `.next`
- `app`
- `components`
- `data`
- `lib`
- `public`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`

Do not include:

- `.env`
- `.env.local`
- `node_modules`
- `.cache`

5. Upload the ZIP in Hostinger Node.js Web App hosting.
6. Use this start command:

```bash
npm run start
```

## Notes

- Progress is stored locally in the browser with localStorage.
- Server-side rate limits reset when the Node app restarts because they are in memory.
- The MVP does not use the Realtime API.
- This is a coaching MVP, not a clinical speech therapy tool.
- No Google login is required for this private single-user version.
