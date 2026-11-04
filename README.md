# People Atlas

A private, persistent people notebook built with Next.js, Supabase Auth, PostgreSQL and private Supabase Storage. See [deployment and migration](docs/vercel-migration.md).

## What works

- Built-in extraction of common English sentences and arbitrary `Label: value` details; editable review before saving. Blank lines separate people, and distinct named sentences are also recognized.
- Optional OpenAI, Google Gemini, Groq, or OpenRouter extraction for flexible free text. Add an API key in Connections and select AI extraction in the inbox. Only explicit facts should be extracted; always review the result. The original note is retained.
- Per-user profiles stored in PostgreSQL, optimistic version checks on edits, and explicit choices for same-name duplicates.
- Automatic folders and charts for every field, with derived age groups and birthday months. Case-insensitive grouping and normalized basic labels.
- Imports: searchable PDF (up to 100 pages / 60,000 characters), DOCX, CSV, TSV, XLSX, TXT, JSON. Up to 15 MB per file and 200 profiles per save batch. XLSX supports choosing a workbook tab and mapping the name column. Original files are saved to private Supabase Storage.
- Exports: XLSX, CSV, PDF, DOCX, JSON, and birthday ICS. All profile fields and source notes are included in people exports. CSV formula cells are escaped. Unicode text is embedded in PDF with DejaVu Sans; unsupported font glyphs render as question marks.
- Google Calendar links and ICS download require no OAuth setup. Optional Google authorization supports user-triggered creation/updating of birthdays in the primary calendar and reading a linked Google Sheet.

Age completes a missing birthday year using today’s date and whether the birthday has happened this year. With no usable day/month, the app adds an Estimated birth year (current year minus age); the true year may be one year earlier. Explicit birth years take priority. Calculations run on extraction, import and save; existing records are updated when saved.

Use the sun/moon button in the header to switch appearance. The app initially follows the device theme and remembers an explicit choice on that device.

## Connections

Sign in using a confirmed email and password. The server verifies the Supabase session before reading or changing account data. Each cloud account has its own workspace.

Anonymous visitors can instead open `/guest`. Guest profiles, settings, and original imported files use IndexedDB in that browser. Guest mode supports the built-in reader, imports, exports, folders, charts, birthday reminders, dark mode, optional Google client configuration, and AI extraction with a guest-supplied provider key. A guest AI key stays only in the open page’s memory, is sent to the selected provider through `/api/guest-extract`, and disappears on reload or close; it is not written to IndexedDB, the cloud database, logs, or API responses. Clearing site data, using a different browser/device, or private browsing can remove or isolate guest data, so the interface recommends a JSON export before those changes. Guest data is not silently merged into a signed-in account; export JSON in guest mode and import it after signing in.

The selected provider’s key is encrypted using AES-GCM. One provider/key is active per user; switching providers requires entering a matching key and replaces the previous key. Existing saved keys remain assigned to OpenAI. Model IDs may include provider prefixes and suffixes such as `/` and `:free`. Non-OpenAI providers use their documented Chat Completions endpoints with JSON output, followed by the same server-side validation and editable review. Set `SETTINGS_ENCRYPTION_KEY` to a base64-encoded 32-byte random secret in the hosted environment before saving keys. Do not rotate that secret without migrating encrypted keys. Keys are never returned to the browser. AI notes go to the selected provider; its account billing, model access, limits, and data policies apply. The default OpenAI model is `gpt-4.1-mini` and can be changed in Connections.

The recommended free setup is OpenRouter with model `openrouter/free`. In Connections, choose **Use recommended free setup**, add an OpenRouter key, and save. Selecting OpenRouter now fills this model ID automatically; existing saved provider/key settings are not migrated or overwritten. The free router chooses an available model matching the requested JSON schema, so model quality and latency can vary. Review displays the actual model returned by OpenRouter. Requests require supported parameters, and the free router and explicit `:free` models have zero maximum prompt/completion/request prices. No paid fallback model is configured. Custom OpenRouter model IDs remain available and follow that model’s pricing. Free request limits and provider availability apply; the built-in reader stays available. Input is still limited to 60,000 characters per extraction.

For Google, the app owner enables Calendar API and Sheets API in the Google Cloud project, configures the OAuth web client for the production origin, and sets the public GOOGLE_CLIENT_ID in Vercel. This configuration is shared by guests and cloud accounts. Users only approve permission for their own Calendar and Sheets access. Google tokens remain in memory and require reauthorization after expiration or reload. Authorization is incremental. Calendar uses calendar.events.owned and Sheets uses spreadsheets.readonly. A personal client ID remains available as a fallback when no app-wide ID is configured. Google sign-in separately uses the Client ID and Client Secret stored in Supabase Auth.

Calendar updates are one-way, run only when requested, and use stable IDs to update existing app events. Deleting a profile does not delete Google events. February 29 events occur only in leap years. Calendar links open a user-reviewed event form; they do not prove an event was saved.

Scanned PDFs require OCR elsewhere. Legacy `.doc` and `.xls` should first be saved as `.docx` and `.xlsx`. Built-in parsing is heuristic; unrecognized prose remains in source notes and files and may need manual fields or AI extraction. This app does not promise that every sentence will be extracted correctly.

## Development

Use Node 24 and the pnpm version declared in package.json. Run pnpm install --frozen-lockfile, then pnpm dev. Use pnpm test for regressions and pnpm build for a native production build. See [deployment and migration](docs/vercel-migration.md) for production configuration, account transition and release checks.

## References

- Google token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google event creation: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google client setup: https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- PDF.js: https://mozilla.github.io/pdf.js/examples/

Provider routing, response handling, encrypted key replacement, and auth tests use mocked provider responses; live inference with a user's saved key is not covered by these checks.

Provider references: https://ai.google.dev/gemini-api/docs/openai · https://console.groq.com/docs/openai · https://openrouter.ai/docs/api/reference/overview

Free setup references: https://openrouter.ai/docs/guides/routing/routers/free-router · https://openrouter.ai/docs/guides/features/structured-outputs · https://openrouter.ai/docs/guides/routing/provider-selection · https://openrouter.ai/docs/api/reference/limits

### Profile, appearance, photos and voice

The account icon in the workspace opens **My profile & appearance**. Account display names, bios, photos, dashboard accents and backgrounds persist in `atlas_preferences`; guest preferences remain in this browser’s IndexedDB. Saved people have an **Add or change photo** picker under **Edit details**. Initials remain the fallback when no photo is selected.

Cloud photos use the private `atlas-images` bucket. The browser decodes JPEG/PNG/WebP uploads up to 15 MB and resizes them to JPEG (512 px for portraits, 1600 px for backgrounds, at most 2 MB). Authenticated server endpoints enforce ownership, origin, raster signature and upload size. Images use short-lived signed access. Account photos and appearance preferences are separate from people JSON/spreadsheet exports. Old replaced uploads remain private in the bucket; storage usage counts toward the Supabase free tier.

Curated Unsplash backgrounds include alpine scenery, ocean, dunes and mountain reflections with photographer credits. These images load from Unsplash when the appearance picker is opened or a preset is selected. Themes retain the existing light/dark control and readable dashboard overlays.

The tour is automatically shown once. Its dismissal is saved to the account, with the existing browser preference carried forward. It remains replayable from navigation. Guest dismissal remains local to the browser. If preference loading fails, the automatic tour waits rather than repeatedly interrupting the user.

**Add with voice** uses the browser Speech Recognition API, where supported, and requires microphone permission. Audio may be processed by the browser’s speech provider; no new paid speech API is configured. Final transcripts append to the editable note, and all existing review/save steps remain required. Unsupported browsers offer typing instead. Real microphone transcription must be checked on the user’s device.


Uploaded account photos, people photos and dashboard pictures now open a crop preview before saving. Use zoom and horizontal/vertical position controls, reset, cancel, or apply the crop. Portraits use a square crop suitable for avatar circles; dashboard crops use 16:9. Cancelling leaves the saved photo unchanged.

The sidebar includes **My profile** (or the saved display name) and **Favourites**. The star at the edge of every People card/list row toggles a favourite independently of opening the person. Favourites keep the existing search/filter controls. Stars persist in account preferences or guest IndexedDB and do not change people’s original fields or notes.

### AI voice transcription

Voice input defaults to **AI transcription · Whisper**, with **Browser dictation** retained as a separate fallback. Record a clip or choose an audio file (up to 15 MB and 90 seconds), replay it, then select **Transcribe recording**. The browser normalizes supported recordings to 16 kHz mono PCM WAV; the server validates the exact format, duration, size and audible signal. The server forwards audio only to Groq’s fixed `whisper-large-v3` transcription endpoint using the existing `SHARED_GROQ_API_KEY`.

An editable transcript review appears before **Add transcript to note**. The note, profile extraction and profile-save review remain separate. A failure preserves the recording and any prior transcript for retry. The recording is held only in the browser tab and transient server/provider request memory; the application does not upload it to persistent object storage. Download it before leaving if you need a copy. Audio is sent to Groq when you select Transcribe. Browser dictation continues using the browser’s speech service.

Apply `20261104014115_atlas_speech_limits.sql` before deploying. A service-only atomic quota enforces ten transcription requests per minute, 6,000 audio seconds per hour and 24,000 per day across the app; each request accounts for at least ten seconds. This leaves headroom under the provider’s published free audio limits, but other usage of the same Groq account can still trigger provider limits. Keep the Groq account on its free plan. The endpoint accepts guests and signed-in users and cannot select a different model, provider or API key. Recordings stop automatically before the 90-second ceiling. Real microphone quality, browser codecs, Nigerian accents and Pidgin require device testing; names and dates should always be checked in the transcript.
