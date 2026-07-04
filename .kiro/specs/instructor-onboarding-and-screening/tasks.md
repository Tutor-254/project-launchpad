# Tasks: Instructor Onboarding and Screening

## Task List

- [x] 1. Database migration
  - [x] 1.1 Create `instructor_applications` table with columns, CHECK constraint, DEFAULT status='pending', and foreign keys
  - [x] 1.2 Add unique partial index `ON instructor_applications (user_id) WHERE (status = 'pending')`
  - [x] 1.3 Enable RLS on `instructor_applications` and add three policies: user INSERT own, user SELECT own, admin SELECT all
  - [x] 1.4 Drop old RLS policy "Users can grant themselves instructor role" from `user_roles`
  - [x] 1.5 Add new RLS policy on `user_roles` restricting instructor role INSERT to admins / service_role
  - [x] 1.6 Create SECURITY DEFINER function `approve_instructor_application(application_id uuid)` — atomically sets status, reviewed_at, reviewed_by, inserts instructor role, inserts approval notification (with best-effort notification handling)
  - [x] 1.7 Create SECURITY DEFINER function `reject_instructor_application(application_id uuid, reason text)` — atomically sets status, rejection_reason, reviewed_at, reviewed_by, inserts rejection notification (with best-effort notification handling)

- [x] 2. TypeScript types update
  - [x] 2.1 Add `instructor_applications` Row / Insert / Update / Relationships types to `src/integrations/supabase/types.ts`

- [x] 3. Auth guards update — `src/lib/auth-guards.ts`
  - [x] 3.1 Add `requireNoApplicationPending(userId)` helper that queries `instructor_applications` for a pending row and throws `redirect({ to: '/apply' })` if one exists
  - [x] 3.2 Update all `/instructor/*` route `beforeLoad` hooks to call `requireNoApplicationPending` after `requireRole` — starting with `src/routes/instructor/index.tsx`

- [x] 4. Hook: `useApplicationStatus` — `src/hooks/use-auth.ts`
  - [x] 4.1 Add `useApplicationStatus(userId)` export that uses `useQuery` to fetch the user's most recent `instructor_applications` row (id, status, created_at, reviewed_at, rejection_reason)

- [ ] 5. Rewrite `/onboarding` route — `src/routes/onboarding.tsx`
  - [x] 5.1 Add `beforeLoad` guard: if user has `display_name` set and no pending application, redirect to `/courses`; if user has a pending application, redirect to `/apply`
  - [x] 5.2 Implement Step 1 — role selection (learn / teach), preserving `intent` search param pre-selection
  - [x] 5.3 Implement Step 2a — student path: display name (required) + learning interests (optional); on submit, `profiles.update` and redirect to `/courses`
  - [x] 5.4 Implement Step 2b — instructor path: application form with expertise (max 200), background (max 1000), portfolio URL (optional, validated), teaching statement (min 50, max 2000); field-level validation errors
  - [x] 5.5 On valid application submit: INSERT into `instructor_applications` and redirect to `/apply`
  - [x] 5.6 Guard against re-submission: if user navigates to the application step but already has a pending application, redirect to `/apply`

- [ ] 6. New `/apply` route — `src/routes/apply.tsx`
  - [ ] 6.1 Create file with `createFileRoute('/apply')` and `beforeLoad` requiring authentication; redirect to `/instructor` if user already has instructor role; redirect to `/onboarding` if user has no application at all
  - [ ] 6.2 Implement **pending state** UI: "Application under review" heading, submission date, review-timeline message, student navigation still accessible
  - [ ] 6.3 Implement **rejected state** UI: rejection reason (or default message), earliest reapplication date (reviewed_at + 30 days), reapply button disabled until window passes with countdown
  - [ ] 6.4 Implement **approved state**: brief success message, auto-redirect to `/instructor` after 2 seconds
  - [ ] 6.5 Add `canReapply(rejectedAt: string, now?: Date): boolean` pure helper function that returns true iff now >= rejectedAt + 30 days

- [ ] 7. Admin console — extend `src/routes/admin.tsx`
  - [ ] 7.1 Add `ApplicationsMod` component that fetches all applications (defaulting to `status = 'pending'` filter) joined with `profiles` display name; renders in reverse-chronological order
  - [ ] 7.2 Add status filter bar (pending | approved | rejected | all) to `ApplicationsMod`
  - [ ] 7.3 Add pending-count badge to the "Applications" tab label using a separate count query (re-fetched after each action)
  - [ ] 7.4 Implement Approve button per row: calls `supabase.rpc('approve_instructor_application', { application_id })` via `useMutation`; on success invalidates the applications query
  - [ ] 7.5 Implement Reject flow: Reject button opens an inline optional-reason textarea, confirm triggers `supabase.rpc('reject_instructor_application', { application_id, reason })` via `useMutation`; on success invalidates the applications query
  - [ ] 7.6 Add "Applications" `TabsTrigger` and `TabsContent` to the existing `Tabs` in `AdminConsole`

- [ ] 8. Site chrome updates — `src/components/site-chrome.tsx`
  - [ ] 8.1 Add application-status awareness to `SiteHeader`: for a user with a pending application (no instructor role), show student navigation and a subtle "Application pending" indicator in the user dropdown instead of "Studio" links

- [ ] 9. Update `/teach` marketing route — `src/routes/teach.tsx`
  - [ ] 9.1 Remove the existing `becomeInstructor` form that directly inserts the instructor role; replace the CTA button with a link to `/auth?mode=signup&intent=teach` (for unauthenticated users) or to `/onboarding?intent=teach` (for authenticated users without an application)
  - [ ] 9.2 If the user already has a pending application, show a "Check your application status" CTA linking to `/apply`

- [ ] 10. Property-based tests
  - [ ] 10.1 Install `fast-check` as a dev dependency
  - [ ] 10.2 Write PBT for Property 10: `canReapply` 30-day cooldown boundary — `Feature: instructor-onboarding-and-screening, Property 10: Reapplication 30-day cooldown`
  - [ ] 10.3 Write PBT for Property 11: `isValidPortfolioUrl` accepts valid HTTP/HTTPS, rejects all others — `Feature: instructor-onboarding-and-screening, Property 11: URL validation`
  - [ ] 10.4 Write PBT for Property 2: Application data round-trip (using a mock Supabase client) — `Feature: instructor-onboarding-and-screening, Property 2: Application data round-trip`
  - [ ] 10.5 Write PBT for Property 3: New application status is always 'pending' (DB default + RLS constraint test using local Supabase) — `Feature: instructor-onboarding-and-screening, Property 3: New application status is always pending`
  - [ ] 10.6 Write PBT for Property 13: Applications list sorted reverse-chronologically — `Feature: instructor-onboarding-and-screening, Property 13: Applications list sorted reverse-chronologically`
  - [ ] 10.7 Write PBT for Property 14: Status filter returns only matching applications — `Feature: instructor-onboarding-and-screening, Property 14: Status filter returns only matching applications`

- [ ] 11. Unit tests
  - [ ] 11.1 Write unit tests for `canReapply`: exactly 30 days, 29d 23h 59m 59s, 30d + 1s, same instant as rejection
  - [ ] 11.2 Write unit tests for `isValidPortfolioUrl`: empty string, valid HTTPS URL, URL without protocol, ftp:// URL, localhost URL, random alphanumeric string
  - [ ] 11.3 Write unit tests for application form validation logic: all fields empty, one required field empty, statement under 50 chars, statement over 2000 chars, portfolio URL validation
  - [ ] 11.4 Write unit tests for the `/apply` route component: pending state renders submission date, rejected state renders reason and reapply date, approved state triggers redirect
