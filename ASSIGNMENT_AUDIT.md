# Movie Memory — assignment audit

Audit date: November 9, 2026 (America/Los_Angeles). Scope: the supplied seven-page SWE Take-Home Exercise (Full-Stack), the current local application, its source archive, and the selected Variant A.

## Verdict

The required stack, base user flows, and core Variant A behavior are implemented and passed the checks below. **The submission package is not fully complete: the required GitHub repository has not been published or connected.** A ZIP is useful but does not replace that deliverable.

Two intentional additions qualify a literal reading of Variant A: repeated generated text is not inserted again, and legacy unsourced facts are excluded from fallback. These choices preserve the accuracy/repetition improvements requested during development. They are documented, not hidden, and should be explained in review. No requirement demands an automatic refresh timer, a particular theme, deployment, or implementing both variants.

## Requirement-by-requirement comparison

| PDF requirement | Result | Evidence / qualification |
|---|---|---|
| TypeScript | Pass | TypeScript checks and production compilation passed. |
| Next.js, App Router preferred | Pass | App Router pages, Server Components, Server Actions. |
| React + TailwindCSS | Pass | React components; Tailwind CSS pipeline and utility classes plus custom component styles. |
| Postgres + Prisma | Pass | Real local Postgres; Prisma models, adapter, two checked-in migrations. |
| Google OAuth | Pass | Auth.js Google provider; successful real returning-user sign-in during this audit. Original new-user Google flow was verified earlier. |
| OpenAI API | Pass | Responses API with required web search and stored source citations; live generated response visible during audit. |
| Logged-out landing with Sign in with Google | Pass | Browser and HTTP checks. |
| First-time users reach onboarding | Pass | Temporary database session without movie redirected to onboarding; historical real first Google login also verified. |
| Returning users reach dashboard | Pass | Fresh real Google sign-in returned to existing profile/movie. |
| Favorite-movie input with server-side trim/min/max validation | Pass | Blank rejection in browser, boundary and invalid-input unit tests, HTTP ownership/persistence check. |
| Save movie in Postgres for authenticated owner | Pass | Real database integration; forged user ID ignored. |
| Onboarding first-time only | Pass | Conditional initial write prevents overwrite; completed user visiting onboarding redirected to dashboard. Separate user-requested Edit action is intentional. |
| Dashboard name/email/photo/movie/logout | Pass | Live Google profile; movie from database. Missing name and broken photo tested with temporary fixture. |
| Logged-out dashboard redirects to login | Pass | HTTP check; authorization tested before database reads. |
| OpenAI movie fact displayed and stored | Pass | Successful generated responses are persisted before display; save-error tests reject unsaved success. Accuracy remains probabilistic, with citations and uncertainty handling. |
| Per-user + movie cache under 60 seconds | Pass | 0ms and 59,999ms unit tests; real Postgres/HTTP reuse with no extra insert. |
| Generate/store after expiry | Pass with explicit exception | 60,000ms boundary and expired-cache integration pass. Identical output or NO_DIFFERENT_FACT keeps the old row/timestamp and shows an honest unchanged notice, instead of storing a duplicate. This extra behavior was requested after the base implementation. |
| Burst / simultaneous-tab protection | Pass within documented scope | 20 overlapping unit calls and 10 expired-cache calls with real Postgres result in one generation/write; concurrent HTTP checks also pass. Process-local promise lock is expressly allowed by PDF; not a distributed guarantee. |
| Provider failure returns latest cached fact | Pass with policy qualification | Returns latest eligible source-backed fact for this user/movie. Legacy version-0 unsourced records are deliberately excluded, even if they are the only history. |
| No saved fallback gives friendly error | Pass | Provider-error and unsupported-title tests. |
| Backend tests: cache and authorization | Pass | Included in 55 passing unit tests and 18 HTTP/Postgres checks. |
| Validate inputs and isolate users' data | Pass | Shared schema; session-owned reads/writes; forged identity and cross-origin rejection tests. |
| No secrets in client | Pass for checks performed | Server-only API/database modules; exact configured secret values absent from 26 built client assets. Source archive excludes private environment/database files. This is not a full penetration test. |
| Handle missing Google photo/name | Pass | Missing name plus broken HTTPS image fell back to Movie lover / initial in current browser audit. |
| Choose one variant, explain why | Pass | README explicitly selects Variant A and explains backend ownership/cache/concurrency motivation. Full Variant B is not required. |
| GitHub repository | **Missing** | No configured Git remote or published repository in this project. |
| README setup/environment/migrations | Pass | Instructions and .env.example present; clean install/setup/build validated without copying real credentials. |
| Architecture overview (1–2 pages) | Present | About 898 words in the architecture section; Markdown pagination is renderer-dependent. |
| Tradeoffs and two-more-hours improvements | Pass | README covers process-local lock, source lookup, data choices, future distributed guard, and other next work. |
| AI usage note | Pass | Dedicated README bullets disclose AI assistance and verification. |
| Ability to explain submitted decisions | Candidate preparation | Documentation helps, but only the candidate can demonstrate this in the interview. |
| 3–5 minute walkthrough video | Optional, not produced | Encouraged by PDF, not mandatory. |

## Current verification evidence

- **55 unit tests passed** across six files.
- **18 HTTP/Postgres integration checks passed**, using temporary accounts and deterministic provider substitutes for failure/concurrency cases. Records removed afterward.
- **Production build / TypeScript passed.**
- **Clean source-only installation passed:** npm ci, setup:local, and production build in an isolated scratch directory, without real credentials or existing node_modules. This did not repeat migration deployment against a brand-new database; both migrations were already applied and verified on the local app database.
- **Dependency audit:** zero known production vulnerabilities; clean install also reported zero vulnerabilities at audit time. This can change as advisories are published.
- **Client secret check:** 26 assets scanned for configured private API/auth/database values; none found. Secrets were not printed.
- **Browser flow:** blank onboarding input rejected; trimmed Arrival (2016) saved; Cancel kept it; Save changed it to Interstellar and switched the fact; reopening onboarding redirected to dashboard; fallback name/avatar rendered; Logout returned to landing.
- **Responsive checks:** dashboard and landing at 375px had document width equal to viewport width; desktop dashboard reviewed at 1280px. Viewport override reset afterward.
- **Live returning-user Google login:** successful using the existing Google session, returned to the actual user's current movie and profile. No fresh Google consent or second-account setup was tested in this audit.
- **Live OpenAI:** current signed-in dashboard displayed a sourced John Wick response. Earlier focused live tests covered Animal, OG, Lord of the Rings, and John Wick; those provider tests are separate from deterministic failure tests.

## Important limitations and submission advice

1. Publish the reviewed source to a GitHub repository and provide that URL. No publication or Greenhouse submission was performed by this audit.
2. Preserve the README's single-process concurrency limitation. Multiple workers/serverless instances would need a database/shared lock.
3. State the duplicate-output exception clearly: the app still requests generation after expiry, but refuses to pretend a duplicate is a new discovery. If the evaluator interprets “store it” literally for every successful expired request, this is a deliberate extension to discuss.
4. External-source lookup and movie editing are optional additions. They increase cost/complexity and are not evidence that full Variant B is complete. The PDF prioritizes clarity and correctness over feature volume; further feature expansion is unnecessary.
5. Source citations are not a guarantee of truth or novelty. Normalized-text detection does not catch every semantic paraphrase. Testing a few movie titles is not exhaustive model evaluation.
6. OAuth is in testing mode. A reviewer needs their own documented OAuth configuration or an approved test account. Deployment is not required by the PDF and was not tested.
7. The ZIP and local app are ready for review, but a complete submission still needs the GitHub deliverable. An optional walkthrough would help explain the schema, cache boundary, lock, and failure cases.
