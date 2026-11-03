# People Atlas

A private, persistent people notebook built for ChatGPT Sites.

## What works

- Built-in extraction of common English sentences and arbitrary `Label: value` details; editable review before saving. Blank lines separate people, and distinct named sentences are also recognized.
- Optional OpenAI, Google Gemini, Groq, or OpenRouter extraction for flexible free text. Add an API key in Connections and select AI extraction in the inbox. Only explicit facts should be extracted; always review the result. The original note is retained.
- Per-user profiles stored in D1, optimistic version checks on edits, and explicit choices for same-name duplicates.
- Automatic folders and charts for every field, with derived age groups and birthday months. Case-insensitive grouping and normalized basic labels.
- Imports: searchable PDF (up to 100 pages / 60,000 characters), DOCX, CSV, TSV, XLSX, TXT, JSON. Up to 15 MB per file and 200 profiles per save batch. XLSX supports choosing a workbook tab and mapping the name column. Original files are saved to private R2 storage.
- Exports: XLSX, CSV, PDF, DOCX, JSON, and birthday ICS. All profile fields and source notes are included in people exports. CSV formula cells are escaped. Unicode text is embedded in PDF with DejaVu Sans; unsupported font glyphs render as question marks.
- Google Calendar links and ICS download require no OAuth setup. Optional Google authorization supports user-triggered creation/updating of birthdays in the primary calendar and reading a linked Google Sheet.

Age completes a missing birthday year using today’s date and whether the birthday has happened this year. With no usable day/month, the app adds an Estimated birth year (current year minus age); the true year may be one year earlier. Explicit birth years take priority. Calculations run on extraction, import and save; existing records are updated when saved.

Use the sun/moon button in the header to switch appearance. The app initially follows the device theme and remembers an explicit choice on that device.

## Connections

The app uses the Sites authenticated-user headers. The server-rendered home page checks identity before loading the workspace; anonymous visitors see a plain top-level link to the platform-owned `/signin-with-chatgpt` flow. All profile, file and settings endpoints independently enforce the authenticated owner. An expired or unrecognized session displays a sign-in action instead of a generic connection error. Site sharing controls who can open the site; saved records remain scoped to the authenticated owner for either public or private site sharing.

Anonymous visitors can instead open `/guest`. Guest profiles, settings, and original imported files use IndexedDB in that browser. Guest mode supports the built-in reader, imports, exports, folders, charts, birthday reminders, dark mode, optional Google client configuration, and AI extraction with a guest-supplied provider key. A guest AI key stays only in the open page’s memory, is sent to the selected provider through `/api/guest-extract`, and disappears on reload or close; it is not written to IndexedDB, D1, logs, or API responses. Clearing site data, using a different browser/device, or private browsing can remove or isolate guest data, so the interface recommends a JSON export before those changes. Guest data is not silently merged into a signed-in account; export JSON in guest mode and import it after signing in.

The selected provider’s key is encrypted using AES-GCM. One provider/key is active per user; switching providers requires entering a matching key and replaces the previous key. Existing saved keys remain assigned to OpenAI. Model IDs may include provider prefixes and suffixes such as `/` and `:free`. Non-OpenAI providers use their documented Chat Completions endpoints with JSON output, followed by the same server-side validation and editable review. Set `SETTINGS_ENCRYPTION_KEY` to a base64-encoded 32-byte random secret in the hosted environment before saving keys. Do not rotate that secret without migrating encrypted keys. Keys are never returned to the browser. AI notes go to the selected provider; its account billing, model access, limits, and data policies apply. The default OpenAI model is `gpt-4.1-mini` and can be changed in Connections.

The recommended free setup is OpenRouter with model `openrouter/free`. In Connections, choose **Use recommended free setup**, add an OpenRouter key, and save. Selecting OpenRouter now fills this model ID automatically; existing saved provider/key settings are not migrated or overwritten. The free router chooses an available model matching the requested JSON schema, so model quality and latency can vary. Review displays the actual model returned by OpenRouter. Requests require supported parameters, and the free router and explicit `:free` models have zero maximum prompt/completion/request prices. No paid fallback model is configured. Custom OpenRouter model IDs remain available and follow that model’s pricing. Free request limits and provider availability apply; the built-in reader stays available. Input is still limited to 60,000 characters per extraction.

For Google, enable Calendar API and Sheets API in a Google Cloud project. Configure an OAuth web client, consent screen, authorized JavaScript origin equal to the deployed app origin, and test users as applicable. Save the public client ID in Connections. Google tokens remain in memory and require reauthorization after expiration/reload. Authorization is incremental: Calendar uses `calendar.events.owned`, Sheets uses `spreadsheets.readonly`. No Google password or client secret is stored.

Calendar updates are one-way, run only when requested, and use stable IDs to update existing app events. Deleting a profile does not delete Google events. February 29 events occur only in leap years. Calendar links open a user-reviewed event form; they do not prove an event was saved.

Scanned PDFs require OCR elsewhere. Legacy `.doc` and `.xls` should first be saved as `.docx` and `.xlsx`. Built-in parsing is heuristic; unrecognized prose remains in source notes and files and may need manual fields or AI extraction. This app does not promise that every sentence will be extracted correctly.

## Development

Use the Sites workflow for dependency installation, building and publication. The project uses pnpm. Schema changes live in `db/schema.ts`; generate migrations with `pnpm run db:generate` and inspect them before publishing. Applied migrations are append-only. Runtime schema creation is not used.

A feature-detected WebMCP tool named `stage_people_note` stages text for review without saving profiles. It shares the visible extraction/review flow. The visible interface has been checked with fictional records; the WebMCP integration itself has not been exercised in a supporting browser.

Run `node --test tests/*.test.mjs` for the complete regression suite, and `pnpm exec tsc --noEmit` for type checking. Tests require Node with `node:sqlite` and `pdftotext` on PATH. The suite covers parsing, imports and exports, calendar output, real SQLite migrations and ownership checks, encrypted settings, source files, authentication, and AI provider error handling. See `docs/debugging-2026-09-16.md` for browser coverage and remaining live-integration checks.

Run `node --test tests/sign-in.test.mjs` for the anonymous sign-in screen, recognized user ownership, rejection of missing/partial identity across saved-data endpoints, safe sign-in destinations, and client error classification. These checks mock platform identity and do not validate the external ChatGPT authorization round trip in a real user browser.

Run `node --test tests/ai-runtime.test.mjs` to exercise the actual provider adapter in the installed Cloudflare Workers runtime with a local mock upstream. This catches runtime-specific request failures and verifies that redirects never forward keys. Requests use `redirect: 'manual'` and explicitly reject 3xx responses because this runtime rejects `redirect: 'error'` before contacting a provider.

## References

- Google token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google event creation: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google client setup: https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- PDF.js: https://mozilla.github.io/pdf.js/examples/

Provider routing, response handling, encrypted key replacement, and auth tests use mocked provider responses; live inference with a user's saved key is not covered by these checks.

Provider references: https://ai.google.dev/gemini-api/docs/openai · https://console.groq.com/docs/openai · https://openrouter.ai/docs/api/reference/overview

Free setup references: https://openrouter.ai/docs/guides/routing/routers/free-router · https://openrouter.ai/docs/guides/features/structured-outputs · https://openrouter.ai/docs/guides/routing/provider-selection · https://openrouter.ai/docs/api/reference/limits
