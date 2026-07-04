## Milestone 4 — Trust, Retention & Polish

Goal: turn the working MVP into something students will come back to and instructors will trust. M4 focuses on lifecycle (wishlists, certificates, email), discoverability polish (SEO + shareable OG images), moderation/admin hardening, and a11y/perf cleanup.

### Scope (grouped)

**A. Learner lifecycle**
1. **Wishlist / bookmarks** — save-for-later on catalogue + course cards, `/wishlist` page.
2. **Certificates on completion** — auto-issue when `lecture_progress.completed = true` for every lecture in a course. Public verify page `/verify/$code`. PDF generated server-side (pure-JS `pdf-lib` — Worker-safe).
3. **Resume playback** — persist `seconds_watched` from the player; "Continue" CTA on `/learn` deep-links to the last lecture at the last timestamp.

**B. Email lifecycle (Lovable app emails)**
Prereqs: `email_domain--check_email_domain_status` → domain setup dialog if missing → `setup_email_infra` → `scaffold_transactional_email` → brand templates.
Triggers (one recipient per event, JWT-authenticated call site inside server fns):
   - `welcome` — post-signup
   - `enrollment-confirmation` — free enrol or paid callback
   - `payment-receipt` — on M-Pesa success (receipt number, order id)
   - `course-published` — instructor confirmation
   - `certificate-issued` — with verify link
   - `new-question` / `new-answer` — mirrors in-app notification, throttled to one-per-hour digest via `pg_cron` batching (single recipient, single event).

**C. Discoverability & sharing**
1. Per-route `head()` with real title/description/OG on `/`, `/courses`, `/courses/$courseId`, `/instructor/$instructorId` public profile page.
2. Course-detail `og:image` = the course thumbnail signed URL (or a server-rendered fallback).
3. `sitemap.xml` + `robots.txt` server routes.
4. Public instructor profile page `/u/$username` — bio, published courses, aggregate ratings.

**D. Trust & moderation**
1. Report content (review, question, answer) — new `reports` table; admin queue.
2. Refund request UI — user submits from `/settings/orders`, admin actions from `/admin`; flips `orders.status='refunded'` and writes a reversing `payouts` row.
3. Rate-limit review/question posting (5/hour per user, enforced in server fn).
4. Fill remaining `has_role`/`handle_new_user` linter warnings.

**E. UX polish & perf**
1. Empty states, skeletons on all list views, toast on every mutation.
2. Keyboard shortcuts in player (Space, ←/→, F).
3. Lighthouse pass: image `loading="lazy"`, `<img>` width/height, prefetch on hover, `defaultPreloadStaleTime` tuning.
4. Mobile pass on `/learn/$courseId` player + curriculum drawer.
5. a11y: focus rings, aria-labels on icon buttons, `prefers-reduced-motion`.

### Non-goals
- Live streaming / real-time lecture rooms.
- Multi-currency, USD/Stripe (M-Pesa/KES only stays).
- Native mobile app.
- Marketing/newsletter emails.

### Schema

```sql
wishlists       (user_id, course_id, created_at)  PK(user_id, course_id)
certificates    (id, user_id, course_id, code UNIQUE, issued_at, pdf_path)
reports         (id, reporter_id, target_type, target_id, reason, status, created_at)
usernames       -- add profiles.username UNIQUE, backfill from display_name
```
Extend `lectures` with `duration_seconds` (nullable) for progress %, and `lecture_progress.last_position_seconds` for resume.

### Server surface

- `src/lib/wishlist.functions.ts` — toggle/list.
- `src/lib/certificates.functions.ts` — `issueIfComplete(courseId)` idempotent; `getCertificatePdf(code)` public.
- `src/routes/api/public/verify/$code.ts` — public verify JSON + `/verify/$code` page.
- `src/routes/api/public/sitemap[.]xml.ts`, `robots[.]txt.ts`.
- `src/lib/email/send.ts` helper + wire each trigger from the existing server fns (no new webhooks).
- `src/lib/reports.functions.ts` + admin actions.

### Routes added

`/wishlist`, `/verify/$code`, `/u/$username`, `/certificates` (mine), plus admin tabs for reports & refunds.

### Tech notes
- Certificate PDF: `pdf-lib` (pure JS, Worker-safe). Rendered inside server fn, uploaded to a new private `certificates` bucket, signed URL returned. No `sharp`/`puppeteer`.
- Progress % = completed lectures / total, shown on `/learn` cards and course sidebar.
- Emails go through Lovable app-email infrastructure only — no third-party provider, no marketing sends.
- All new public tables get GRANTs + RLS with narrow `TO anon` only for verify + public profile reads.

### Deliverables & doc
- Migrations for wishlist / certificate / report / username / duration.
- New certificates bucket + policies.
- Updated `README.md` marking M4 complete with the new schema and email trigger list.

### Open questions
1. Which slice of M4 do you want first — **all of A+B** (learner lifecycle + email), **A+C** (lifecycle + SEO/public profiles), or **everything above**?
2. Certificates: instructor-signed name + course title is enough, or do you want the instructor to upload a signature image and pick an accent color per course?
3. Refunds: manual admin-only (simpler, matches non-goal on disbursement) or user-initiated request flow?
