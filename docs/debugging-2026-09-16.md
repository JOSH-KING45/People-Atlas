# Debugging verification — 16 September 2026

## Repairs

- Keep the Workers-compatible provider request fix: use manual redirects and reject redirect responses without forwarding credentials. Differentiate provider timeouts from network failures, and reject malformed responses without losing the note or exposing provider response text.
- Parse only exact supported birthday formats. For example, `maybe 15 June` remains unresolved instead of accidentally becoming a May birthday. Numeric dates use day/month/year. Invalid explicit ages do not enter age groups.
- Preserve distinct values supplied under repeated or equivalent field labels, including AI output. Protect custom labels that overlap object properties, and keep field-level Name/Notes details separate from profile name/source notes.
- Preserve spreadsheet columns, including identifiers, alternate name columns, and data beyond the header width. Respect the selected name column. Reject duplicate spreadsheet headers and spreadsheet formulas without saved results.
- Reject malformed JSON imports, invalid request bodies, and oversized normalized fields with useful errors.
- Retain the selected people filter when opening Files & export. Values literally named `all` now remain selectable as a specific group.
- Give custom-field inputs accessible labels, preserve safe profile ID creation in browsers without `crypto.randomUUID`, and stop a deleted merge target from becoming an unintended separate profile.
- Reject mismatched-origin writes and escape carriage returns in exported calendar text.

Existing production records and saved credentials were not rewritten during this audit. Previously misinterpreted birthday values need review against their original notes; the parser change does not reconstruct old data.

## Automated verification

`node --test tests/*.test.mjs`: **35 passed, 0 failed**.

- Real SQLite with the actual migrations: profile creation/update/deletion, per-user ownership, stale versions, partial batch conflicts, and post-normalization limits.
- Private encrypted provider settings: key replacement, preservation, removal, and isolation between accounts.
- Original file upload/download/deletion with a byte-preserving R2 fixture and account isolation.
- Built-in extraction, custom-field normalization, exact/uncertain birthdays, name-column selection, grid headers, UUID fallback, folders, and leap days.
- Real CSV, XLSX, JSON, DOCX and PDF export content; CSV/XLSX/JSON round trips; spreadsheet and JSON validation. PDF content checked with `pdftotext`.
- Calendar ICS escaping and UTF-8 folding; stable Google event identifiers, create/update requests, and partial-failure reporting against a mock upstream.
- Authentication gates, safe sign-in URLs, client error classification, provider request construction, structured response validation, free-router constraints, timeout/network failures, and secret-safe diagnostics.
- Provider adapter requests executed in the installed Cloudflare Workers runtime against a local mock upstream, including redirect rejection.

`pnpm exec tsc --noEmit`: passed.

## Browser verification

The real anonymous page displayed the sign-in screen and a top-level ChatGPT sign-in link. Because the hosted authorization round trip was unavailable in the local preview, workspace UI checks used the real React workspace with fictional in-memory records. No production authentication was bypassed or disabled. The fixture blocks external fetches, and its AI results are explicitly simulated.

Verified in the desktop browser:

- Plain-text extraction, editable review, adding custom fields, saving, editing, searching, and cancelling deletion.
- Duplicate-person selection and merging without losing existing details.
- Folder and chart navigation, a group literally named `all`, and filtered export scope.
- Calendar links, opening connection settings, and selecting the recommended OpenRouter setup.
- A simulated failed request retains the complete note; retry opens review.
- Uploading and extracting a searchable PDF and DOCX, including their dynamically loaded readers and the PDF worker.
- XLSX upload, name-column selection, preserved alternate name and custom columns, date normalization, review, and save.

Automated file-content tests separately cover all five people export formats.

## Repeating the isolated UI check

Use the supervised Sites preview. Temporarily copy `tests/fixtures/workspace.html` to `public/qa-people-atlas.html` and visit `/qa-people-atlas.html` on the local preview only. Generate fictional import files with:

```sh
node tests/create-browser-fixtures.mjs /absolute/scratch/path/debug-fixtures
```

Remove `public/qa-people-atlas.html` before building or publishing. The fixture modules remain under `tests/`; they are not production routes or authentication helpers. Confirm that neither the harness nor its fictional data appears in packaged assets.

## Not verified live

- Inference using the owner's saved OpenRouter key, account balance/limits, or current upstream model availability.
- The full hosted ChatGPT authorization round trip in a user's browser.
- Google OAuth consent, live Google Sheets reads, or changes to a real calendar.
- Interaction on a physical phone or the optional WebMCP browser integration.

These require the relevant signed-in browser/account. Passing mocked integration tests does not establish live account access or external service availability.
