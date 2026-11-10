# Implementation verification

Checked November 9, 2026 (America/Los_Angeles).

## Base checkpoint (historical)

- TypeScript type checking.
- Production Next.js build.
- 23 unit tests covering validation, authenticated ownership, onboarding mutations, generation failures, and persistence-before-success.
- Initial Prisma migration applied successfully to an isolated real Postgres database.
- 13 HTTP/database integration checks: landing page, logged-out redirect, unfinished onboarding, missing-name fallback, blank-title validation, trimmed persistence, forged user-ID rejection, first-time-only saving, fact persistence/ownership, dashboard isolation, unavailable-provider error, returning-user navigation, action-origin rejection, and logout. Some checks cover multiple assertions.
- Browser review of the landing page at desktop and narrow/mobile widths; no horizontal overflow at 375px.
- Browser exercise of the real onboarding form: whitespace error, successful save, dashboard navigation, missing-photo fallback, provider-error retry, and logout.
- Strict live-provider integration run (`REQUIRE_LIVE_OPENAI=1 npm run test:integration`) passed all 13 checks after the user added API credits. A real OpenAI fact was rendered in the dashboard response and persisted in Postgres. Temporary users, sessions, and facts were removed after the test.
- npm dependency audit reported zero vulnerabilities at install time.

## Scope of test doubles

Browser checks of authenticated pages used a temporary local-only proxy outside the deliverable application, with a temporary user and a normal Auth.js database session. This verified the actual form, dashboard, and logout, but did not test Google's OAuth exchange. The proxy was stopped and the temporary account removed afterward. There is no demo login or authentication bypass in the application.

The isolated fact-service persistence check uses a deterministic provider response and a real Prisma/Postgres write. Unit tests also substitute provider responses. Separately, the strict live integration run exercised the real dashboard with OpenAI and verified that the generated fact was stored; that live-provider check passed.

## Live-service acceptance completed

- Google Cloud project: `movie-memory-514301` (Movie Memory), owned by the user's selected account.
- OAuth branding is configured in testing mode. The user accepted Google's policy. After explicit approval, the Web application client `Movie Memory Local` was created with origin `http://localhost:3000` and redirect `http://localhost:3000/api/auth/callback/google`.
- Google client credentials are saved only in the private, git-ignored `.env`. The selected Google account was added as a test user.
- Real Google sign-in completed in Chrome and redirected the new user to onboarding. The Google account relation and profile name/photo were verified in Postgres.
- The real onboarding form saved the trimmed temporary title `Arrival (2016)` and opened the dashboard. Name, email, photo, movie, and a live OpenAI fact were visible. The fact was verified in Postgres.
- Logout returned to the public landing page. A second real Google sign-in skipped onboarding and opened the dashboard with the same movie. A new database session and a second saved fact confirmed the returning-user flow.
- After verification, only the temporary Arrival choice and its two generated test facts were cleared. The user's Google account and authenticated session were retained, and the app returned to onboarding for the user's own movie choice.
- Google authentication and live OpenAI generation have no remaining setup blockers on this machine. OAuth remains in testing mode; additional Google accounts must be added as test users before use.

## Verification limits

- A second distinct Google account was not used for the live OAuth check. Cross-user isolation passed both unit and real database/HTTP tests using separate temporary accounts.
- Earlier invalid-key and exhausted-credit failures were resolved by the user supplying a valid key and adding API credits. The friendly provider-failure state was verified before those issues were resolved.
- No external deployment was requested or tested. Local environment secrets and database contents are excluded from the source archive.

Variant A is now implemented and verified below. Nothing has been submitted to Greenhouse or published to GitHub.

## Neo-noir appearance update

Production build passed after the palette and typography changes. Verified the signed-in dashboard at 1280px desktop and 375px phone widths with no horizontal overflow, and confirmed Space Grotesk headings and Inter body text load. Application behavior was unchanged; earlier functional test results above were not rerun for this styling update.

## Variant A verification

- Production Next.js build, including TypeScript checks, passed.
- 37 unit tests passed across five files. Coverage includes 0ms/59,999ms hits, exact 60,000ms expiry, unchanged timestamps on reads, cold cache, 20 overlapping requests, user/movie lock isolation, provider failures with and without fallback, lock release after failures, invalid model output, database failures, and the session-owned fact entry point.
- 16 HTTP/Postgres integration checks passed. Added fresh-cache reuse without writes, concurrent HTTP requests with a forged user ID, ten simultaneous expired-cache service requests producing one provider call and one insert, and a provider-timeout fallback without writes. Temporary test accounts and their records were removed in finally; the real user's data was not reset.
- Browser check: the signed-in dashboard displayed a newly generated live OpenAI fact. Clicking Refresh fact within 60 seconds retained identical text and changed the status to “Saved fact · Fresh for 60 seconds.”
- The cache and fallback integration cases use deterministic provider substitutes and real Postgres. The browser check above exercised live OpenAI separately.
- No schema change or migration was needed: the existing user/movie/timestamp index supports this lookup.
- Concurrency protection is process-local, as explicitly permitted by Variant A. It is not verified or guaranteed across multiple server workers; the README documents the limitation and database-lock upgrade path.

## Movie editing update

42 unit tests and production build passed. New action tests cover validation, authentication, forged user ID, write failure, and a missing user row. Browser verification with an isolated temporary account confirmed Cancel preserves the title, whitespace is rejected, saving a trimmed new title updates the dashboard, the new movie's cached fact replaces the old one, and the change survives reload. The temporary account and preview proxy were removed afterward. The user's actual favorite movie was not changed.

## Source-backed movie identification update

- Added a forward-only migration for citation metadata and generation-policy version; applied successfully without deleting existing records. Version-0 unsourced facts no longer qualify for fresh cache or stale fallback.
- 50 unit tests passed. Added completed-search/citation requirements, ambiguous or unsupported output rejection, safe citation URL and offset validation, friendly clarification errors, and citation persistence.
- 17 HTTP/Postgres integration checks passed, including exclusion of a newer unsourced legacy fact.
- Production build and TypeScript checks passed.
- Live API smoke checks returned cited film identities for ANIMAL (2023 Hindi film, Sandeep Reddy Vanga), OG (They Call Him OG, Sujeeth), The Lord of the Rings (explicit Fellowship of the Ring installment), and John Wick (2014, Chad Stahelski). These checks used real paid web-search requests with no database writes, and confirm source-backed responses rather than independently proving every claim.
- Kept gpt-4.1-mini; added required web search and a 30-second timeout. The interface still warns that AI can make mistakes.

Browser verification of the signed-in ANIMAL dashboard showed the 2023 Hindi film identity and a clickable source citation. The screenshot is saved separately; the user’s title was not changed.

## Repeated-fact handling verification

55 unit tests, 18 database/HTTP integration checks, production build, and TypeScript checks passed. Added tests for previous-fact context, duplicate text despite citation/case differences, explicit no-different-fact responses, unchanged timestamp/no insert, and subsequent retry. Live OG refresh returned its previous music-rights claim; the browser correctly showed “No different fact found—showing your previous fact.” This verifies the duplicate fallback, not guaranteed unique generation.

## Full assignment audit

See ASSIGNMENT_AUDIT.md for the full requirements matrix and current results. Re-ran 55 unit tests, 18 integration checks, build, clean source-only install/build, dependency audit, client-secret scan, browser onboarding/edit/logout/returning Google login, and desktop/mobile checks. GitHub publication remains missing; intentional duplicate-output and legacy-fact eligibility exceptions are documented.
