# People Atlas on Vercel

Install with Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build`. Start the production server with `pnpm start`. The test suite uses pdftotext for PDF verification. The native deployment uses the Vercel Next.js preset with automatic output discovery. The historical SQLite migrations in drizzle/ are references for the Sites data format.

## Configure a dedicated Supabase project

Use a fresh project. Inspect its schema, existing grants and storage policies before applying the numbered SQL files in supabase/migrations in order. Use tracked migrations. Keep the original Sites project online throughout migration. The application uses the Supabase Data API, Auth and Storage. Turn on the Data API for the public schema and email/password sign-in with email confirmation. Set the Auth Site URL to the validated HTTPS origin. Confirmation emails verify the address. Return to /login to sign in with the password. Production email delivery and rate limits need a live test with a real recipient.

Set these variables in the matching Vercel environment. Use a separate backend and credentials for preview branches.

| Variable | Purpose |
| --- | --- |
| SUPABASE_URL | Dedicated project API origin |
| SUPABASE_PUBLISHABLE_KEY | Project publishable key for server-side Auth |
| SUPABASE_SECRET_KEY | Server-only secret with service-role privileges |
| SETTINGS_ENCRYPTION_KEY | Stable base64 32-byte AES-GCM key for stored personal AI credentials |
| SHARED_OPENROUTER_API_KEY | Optional included AI credential, server only |

The application verifies every saved-data request with Supabase Auth. It then scopes service-role writes and administrative reads to the verified ID. Direct authenticated reads of people and file metadata also enforce RLS. Direct client access to settings and write RPCs is denied. The people batch function commits valid drafts and reports conflicts; database exceptions roll back the batch. All profiles are exported and imported through the existing review flow.

Original files use signed private uploads and 60-second download links. The browser uploads directly, the bucket enforces a 15 MiB cap, and the API verifies ownership and actual stored size before publishing the metadata. If a browser closes after upload and before finalization, an unlisted object may remain. Inspect orphan candidates against public.sources before removal. Never expose a public bucket or install permissive storage policies for atlas-originals.

The shared extractor uses a database-backed budget of five calls per minute for the whole app. It only requests free-priced OpenRouter routes. Add Google Calendar and Sheets authorized JavaScript origins for the actual production host and, after validation, the custom domain. The public Google client ID remains a per-user setting.

## Move existing accounts and records

1. In the old Sites account, export the profiles as JSON and download each original import file separately. Verify the files open and keep this backup. Guest records require export from the same browser and original origin.
2. Register a new People Atlas account and confirm its email. Sites identities and sessions have no automatic mapping to Supabase.
3. Import the JSON, review the drafts and resolve duplicates. Compare profile counts, field values and original notes. The importer creates new records and timestamps. It does not preserve historical IDs or revision numbers.
4. Upload original documents separately; inspect the preview before saving any extra drafts. JSON alone does not restore the original bytes. Re-enter personal provider credentials and Google settings.
5. For a bulk transfer requiring exact old IDs, file keys, timestamps or ownership, obtain an authorized D1/R2 export and an explicitly verified owner mapping first. Never match accounts solely by display name or an unverified email.

## Release checks

Verify email confirmation, logout, session refresh, two-account isolation, create/update/delete, signed private uploads and byte-exact downloads (including 15 MiB), and persistence across a redeployment. Exercise guest IndexedDB, extraction, review and backup/restore from a fresh browser. Verify real AI and Google calls separately with consented credentials. Attach mypeople.com.ng after validation on the Vercel URL; use the ownership challenge and DNS target issued for that project. Check HTTPS before switching traffic.
