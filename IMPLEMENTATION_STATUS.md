# People Atlas UI/UX improvement

## Included AI follow-up

Added server-only SHARED_OPENROUTER_API_KEY capability. Public ai-status exposes only availability. Guest extraction without a personal key uses the shared free route; signed-in extraction falls back to it when no personal key is saved. Personal keys still take priority and existing ownership/origin guards remain. No database migration. Three targeted shared-AI tests pass (guest, account fallback, validation/security); existing personal-key and authentication tests pass. TypeScript passes. Production secret configured separately; never put its value in source. Build/publish this checkpoint to apply it. Live provider success remains unverified from the restricted preview environment.

Base: production version 9. Preserve public access, guest/cloud boundaries, all integrations and existing schema. Do not change runtime secrets.

Plan: (1) reusable meaningful-value AND filters and card/list directory; (2) capture/review, onboarding, profile overview and actionable insights; (3) responsive styling, themes, motion/accessibility; (4) one full regression/browser QA, build and publish.

Current: shared filters, filter-aware directory, saved card/list preference, onboarding/quick capture, global search, mobile navigation, profile overview/notes/edit, review confirmation/conflict controls, important dates and actionable insights are implemented. Light/dark responsive styling and reduced-motion rules added. Targeted filter tests and TypeScript passed before final provenance/mobile refinements. No dependencies or database migrations needed.

QA: full regression 42/42 passed, TypeScript passed. Follow-up targeted tests passed after shared placeholder grouping and legacy age-only birth-year improvements (5 filter tests now). Browser verified manual creation, multi-profile extraction review, calculated-year editing, saving, Phone and Phone+Email filters, search+filters, clear/remove, compact view preference, smart folder results, profile notes, important dates/calendar, insights, guest AI setup/error recovery, mobile drawer closing, dark mode and CSV import at 390px. Temporary responsive harness removed. Reduced-motion CSS removes all nonessential transitions/animations.

Next: final build from cleaned source, commit/push, package and publish. Preview remains running. Review-only calculatedFields metadata identifies calculated birthday years without changing database schema. No migrations, dependencies, auth or runtime-secret changes.

QA limitations: real OpenRouter request still reports could not be reached in preview and preserves the note. Export event confirmation timed out; actual file-generation/roundtrip tests pass. Cloud account ownership and integrations passed automated tests, but this anonymous preview cannot exercise a live ChatGPT/Google session. Do not claim live integration success.

Known pre-existing limitations: live AI provider could not be reached in managed preview; browser download events did not confirm downloads; Google/account live QA requires authorized session. Do not claim those live workflows pass from mocked tests.

Resume from this file and git diff; do not redo initial architecture analysis. Relevant files: app/people-workspace.tsx, components/atlas-ui.tsx, app/globals.css, lib/people.ts, lib/field-filters.ts, components/people-directory.tsx.

## Guided tour follow-up (2026-09-17)
Implemented seven-step guided tour and navigation Replay tour for guests and signed-in accounts. Uses existing Dialog and sidebar controls. Completion/skip is a browser-local preference keyed separately by authenticated user ID and guest; it does not sync across devices. Tour navigates existing views without changing notes, filters, profiles or integrations. Guest browser checks passed: automatic opening, all steps, Back, completion, replay, skip, and reload persistence. TypeScript and production build passed. Signed-in flow uses the same component with server-provided account scope; live sign-in was not exercised. Mobile sizing uses existing responsive dialog with bounded scrolling; no browser viewport emulation available. Existing reduced-motion styles apply. Publish this exact source next.

## Button interaction follow-up
Added shared 180ms hover/press/focus feedback, hover limited to fine pointers, 44px coarse-pointer targets, wrapping mobile action rows including tour/profile/review/calendar, disabled-state handling, and reduced-motion overrides. CSS only; no data or API changes. Production build and diff checks passed. Mobile device interaction was not browser-tested in this CSS-only follow-up.

## Spotlight tour follow-up
Tour now highlights actual capture, Add person, filters, folders, insights, calendar, and import controls. Tracks target geometry on scroll/resize, positions explanation above/below target, keeps navigation outside scrollable copy. Final optional action opens an unsaved manual draft after closing the tour. Existing completion keys and replay preserved. Guest browser checked all seven highlights and practice transition; TypeScript and production build passed. Real phone and signed-in browser testing not performed.

## AI error UX follow-up
Safe error codes now propagate through ApiError/JSON/RequestError for connection, timeout, provider usage limit, busy service and access failures. No upstream messages are exposed. Provider 401 remains distinct from app sign-in expiry. Extraction banner preserves note, offers Retry and explicit built-in extraction with the same note and normal review. 21 targeted AI/auth/shared tests and production build passed. Live provider errors and browser fallback were not exercised in this follow-up.

## Mobile browser follow-up
Tour uses an edge-anchored mobile bottom sheet, resets conflicting centered-dialog transforms/animation, keeps footer outside scrollable copy, and collapses tips. Heading focus avoids scrolling; spotlight tracks visual viewport changes. Mobile inputs use 16px text, filters wrap, dialogs and profile tabs fit narrow screens, safe-area padding protects bottom navigation. No backend/schema/dependency changes. Browser narrow-frame QA: all seven tour steps and action bounds at 320px, tour bounds at 390/430px, replay, tips, dark mode, practice draft dialog, and People navigation; no horizontal overflow observed. This is narrow-browser testing, not physical-device/keyboard testing. Temporary harness removed. TypeScript passed before final build.

## Atlas identity redesign follow-up
Applied compact dashboard hierarchy with recent people/upcoming dates before capture in DOM and visual order, grouped navigation, functional copy, restrained surfaces, shared spacing/radius tokens, and improved directory metadata/search-match details. Added profile Memory Board using existing notes and named personal fields (Caveat for short personal content), dates/activity Timeline, and shared-field Connections (not inferred friendships). Profile navigation protects unsaved edits. No schema/API/auth changes. No new photo storage or full edit-history backend: board uses existing text/date content.
QA: TypeScript and 47 automated regressions passed; guest browser verified extraction/review/save, Phone filter showing the actual number, memory rendering, connections, timeline, editing date, dark mode, desktop dashboard, 320px profile/board no overflow, and all seven mobile tour steps/replay. No physical phone or live authenticated Google/AI-provider session tested. Temporary mobile harness removed.
