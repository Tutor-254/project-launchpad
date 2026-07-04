# Requirements Document

## Introduction

The **Instructor Onboarding and Screening** feature redesigns the sign-up and onboarding flows for Arcane. Today, any user can self-grant the instructor role instantly — with no screening. This feature replaces that with a curated model inspired by Outlier.ai, MasterClass, and Udemy Pro: users declare their intent (learn vs. teach) at sign-up, students get a frictionless profile setup, and instructor applicants go through an application and admin review process before gaining the instructor role and access to the Studio.

The existing `/onboarding` route, the `user_roles` table, and the `/admin` console are all extended. A new `instructor_applications` table is introduced. The self-grant RLS policy on `user_roles` is removed and replaced by admin-only instructor role assignment.

---

## Glossary

- **Arcane**: The learning marketplace platform (the system under specification).
- **Auth_System**: Supabase Auth, handling email/password and Google OAuth sign-up and sign-in.
- **Onboarding_Flow**: The post-sign-up wizard that collects role intent and profile data.
- **Student**: A user with only the `student` role, enrolled to learn on the platform.
- **Instructor_Applicant**: A user who has submitted an instructor application and is awaiting review.
- **Instructor**: A user with the `instructor` role, granted by an admin after application approval.
- **Admin**: A user with the `admin` role, responsible for reviewing and deciding on instructor applications.
- **Application**: A row in `instructor_applications` representing one instructor application submitted by a user.
- **Application_Status**: The current state of an Application — one of `pending`, `approved`, or `rejected`.
- **Studio**: The instructor-only area of Arcane, accessible at `/instructor`.
- **Admin_Console**: The admin-only area at `/admin`, extended with an Applications tab for this feature.
- **Notification**: A row in the `notifications` table delivered to a user about an event affecting them.
- **Reapplication_Window**: The 30-day waiting period after a rejection before a new application may be submitted.

---

## Requirements

### Requirement 1: Role Intent at Sign-Up

**User Story:** As a new user, I want to declare whether I intend to learn or to teach when I sign up, so that Arcane can route me to the right onboarding experience from the start.

#### Acceptance Criteria

1. WHEN a user initiates sign-up (email/password or Google OAuth), THE Onboarding_Flow SHALL present a role-selection step with exactly two options: "I want to learn" and "I want to teach."
2. THE Onboarding_Flow SHALL require the user to select a role intent before proceeding to the profile setup step.
3. WHEN a user selects "I want to learn" and completes sign-up, THE Auth_System SHALL assign only the `student` role to that user in `user_roles`.
4. WHEN a user selects "I want to teach" and completes sign-up, THE Auth_System SHALL assign only the `student` role to that user in `user_roles` at account creation time; the `instructor` role SHALL NOT be granted until an Application is approved by an Admin.
5. THE Onboarding_Flow SHALL pre-select the "I want to teach" option WHEN the sign-up page was reached via the `/teach` marketing page or an `intent=teach` query parameter.
6. THE Onboarding_Flow SHALL preserve the selected role intent across Google OAuth redirects by storing it in the OAuth `redirectTo` URL or state parameter before the external redirect.

---

### Requirement 2: Student Onboarding

**User Story:** As a new student, I want a short, frictionless onboarding experience, so that I can start browsing and enrolling in courses as quickly as possible.

#### Acceptance Criteria

1. WHEN a new user selects "I want to learn" and completes the role-selection step, THE Onboarding_Flow SHALL present a profile setup form requesting: display name (required), and learning interests (optional, free text or tag selection).
2. WHEN a student submits the profile setup form with a non-empty display name, THE Onboarding_Flow SHALL persist the display name and learning interests to the `profiles` table and redirect the student to `/courses`.
3. IF a student submits the profile setup form without a display name, THEN THE Onboarding_Flow SHALL display an inline validation error and SHALL NOT proceed to the next step.
4. THE Onboarding_Flow SHALL complete the student path in no more than two steps: role selection and profile setup.
5. WHEN a returning authenticated user navigates to `/onboarding` and already has a `display_name` set in `profiles`, THE Onboarding_Flow SHALL redirect that user to `/courses` without re-presenting the onboarding steps.

---

### Requirement 3: Instructor Application Submission

**User Story:** As a prospective instructor, I want to submit an application with my credentials and teaching intent, so that Arcane can evaluate whether I am a good fit.

#### Acceptance Criteria

1. WHEN a new user selects "I want to teach" and completes the role-selection step, THE Onboarding_Flow SHALL present an instructor application form with the following fields:
   - Area of expertise (required, free text, max 200 characters)
   - Professional background (required, free text, max 1000 characters)
   - Portfolio / professional links (optional, URL input accepting LinkedIn, GitHub, YouTube, or personal site URLs, max 500 characters)
   - Teaching statement — why they want to teach on Arcane (required, free text, min 50 characters, max 2000 characters)
2. IF a user submits the application form with any required field empty, THEN THE Onboarding_Flow SHALL display a field-level validation error for each empty required field and SHALL NOT submit the application.
3. IF a user enters a portfolio URL that does not conform to valid HTTP or HTTPS URL syntax, THEN THE Onboarding_Flow SHALL display an inline validation error on that field and SHALL NOT submit the application.
4. WHEN a user submits a valid application form, THE Onboarding_Flow SHALL insert a row into `instructor_applications` with `status = 'pending'`, `user_id` matching the authenticated user, and all submitted field values stored exactly as entered.
5. WHEN an application is successfully submitted, THE Onboarding_Flow SHALL display an "Application submitted" confirmation screen that communicates the pending review status and expected next steps.
6. THE Onboarding_Flow SHALL ensure that a user with an existing `pending` Application cannot submit a second application; IF such a user navigates to the application form, THE Onboarding_Flow SHALL redirect them to the pending status screen.

---

### Requirement 4: Pending Applicant Experience

**User Story:** As an instructor applicant awaiting review, I want clear feedback on my application status, so that I know my application was received and understand what happens next.

#### Acceptance Criteria

1. WHILE a user's most recent Application has `status = 'pending'`, THE Arcane SHALL display an "Application under review" status screen when that user navigates to `/instructor` or `/onboarding`.
2. WHILE a user's most recent Application has `status = 'pending'`, THE Arcane SHALL deny that user access to all Studio routes under `/instructor` and redirect any direct navigation attempts to the pending status screen.
3. THE Arcane SHALL display the pending status screen with the submission date of the application and a message indicating that review typically takes a specified number of business days.
4. WHILE a user's most recent Application has `status = 'pending'`, THE Arcane SHALL display the `student` role navigation (My Learning, course browsing) as the primary interface, so the user can continue learning while awaiting review.

---

### Requirement 5: Application Approval Flow

**User Story:** As an approved instructor applicant, I want to be notified of my approval and gain access to the Studio immediately, so that I can start building my first course.

#### Acceptance Criteria

1. WHEN an Admin approves an Application, THE Admin_Console SHALL atomically: set `instructor_applications.status` to `'approved'`, set `reviewed_at` to the current timestamp, set `reviewed_by` to the Admin's `user_id`, and insert a row into `user_roles` granting the applicant the `instructor` role.
2. WHEN an Admin approves an Application, THE Arcane SHALL insert a Notification row for the applicant with `type = 'application_approved'` and a payload containing a link to the Studio.
3. WHEN an approved applicant next visits Arcane after approval, THE Arcane SHALL display the Studio navigation and redirect the user to `/instructor` if they land on the pending status screen.
4. AFTER an Application is approved, THE Arcane SHALL update the applicant's `profiles` row with the `headline` field if one was provided during the application, preserving any existing `display_name`.

---

### Requirement 6: Application Rejection Flow

**User Story:** As a rejected instructor applicant, I want to receive a clear rejection notice with a reason, so that I understand why I was not accepted and know when I can reapply.

#### Acceptance Criteria

1. WHEN an Admin rejects an Application, THE Admin_Console SHALL atomically: set `instructor_applications.status` to `'rejected'`, store the rejection reason in `rejection_reason` (which may be empty if the Admin provides none), set `reviewed_at` to the current timestamp, and set `reviewed_by` to the Admin's `user_id`.
2. WHEN an Admin rejects an Application, THE Arcane SHALL insert a Notification row for the applicant with `type = 'application_rejected'` and a payload containing the rejection reason (or a default message if none was provided) and the earliest reapplication date.
3. WHEN a rejected applicant views the status screen, THE Arcane SHALL display the rejection reason (or a default message) and the earliest date on which a new application may be submitted (30 days after `reviewed_at`).
4. IF a user attempts to submit a new Application within 30 days of the most recent rejection's `reviewed_at`, THEN THE Onboarding_Flow SHALL reject the submission and display the remaining days before reapplication is permitted.
5. WHEN 30 days have elapsed since the most recent rejection's `reviewed_at`, THE Arcane SHALL permit the user to navigate to the instructor application form and submit a new Application.

---

### Requirement 7: Admin Applications Queue

**User Story:** As an admin, I want a dedicated Applications tab in the admin console where I can review, approve, or reject pending instructor applications, so that I can curate the quality of instructors on the platform.

#### Acceptance Criteria

1. THE Admin_Console SHALL include an "Applications" tab alongside the existing Reviews, Questions, and Courses tabs, visible only to users with the `admin` role.
2. WHEN an Admin opens the Applications tab, THE Admin_Console SHALL display all Applications with `status = 'pending'` in reverse chronological order by `created_at`, showing for each: applicant display name, email, area of expertise, professional background, portfolio URL (if provided), teaching statement, and submission date.
3. THE Admin_Console SHALL provide an "Approve" button and a "Reject" button for each pending Application row.
4. WHEN an Admin clicks "Reject", THE Admin_Console SHALL present an optional text input for a rejection reason before confirming the action.
5. WHEN an Admin clicks "Approve" or confirms a rejection, THE Admin_Console SHALL immediately remove the application from the pending queue and update the displayed count of pending applications.
6. THE Admin_Console SHALL display a count of pending applications as a badge on the "Applications" tab label, updating in real time as applications are processed.
7. WHERE filtering is enabled, THE Admin_Console SHALL allow Admins to filter the applications list by status (`pending`, `approved`, `rejected`) to review historical decisions.

---

### Requirement 8: Data Integrity and Security

**User Story:** As a platform operator, I want the application data and role assignment to be secure and internally consistent, so that the screening process cannot be bypassed.

#### Acceptance Criteria

1. THE Arcane SHALL remove the existing Row Level Security policy that allows authenticated users to self-insert the `instructor` role into `user_roles`.
2. THE Arcane SHALL add a Row Level Security policy on `user_roles` that permits `instructor` role insertion only via the `service_role` (server-side) or by a user with the `admin` role, preventing client-side self-promotion.
3. THE Arcane SHALL enforce Row Level Security on `instructor_applications` such that: authenticated users may insert and read only their own applications; admins may read and update all applications; no user may update `status`, `reviewed_by`, or `reviewed_at` from the client.
4. WHEN a new Application is inserted, THE Arcane SHALL enforce a database-level constraint that `status` defaults to `'pending'` and may only be set to `'approved'` or `'rejected'` by a server-side function or admin-role policy.
5. THE Arcane SHALL enforce a database-level unique constraint ensuring that a given `user_id` has at most one Application with `status = 'pending'` at any time.
6. WHEN the admin approval function executes, THE Arcane SHALL perform the role insertion and status update within a single database transaction so that a partial failure leaves no orphaned state.

---

### Requirement 9: Notifications

**User Story:** As an applicant, I want to receive in-app notifications when my application status changes, so that I do not need to manually check the status screen.

#### Acceptance Criteria

1. WHEN an Application transitions to `status = 'approved'`, THE Arcane SHALL insert exactly one Notification row for the applicant with `type = 'application_approved'`.
2. WHEN an Application transitions to `status = 'rejected'`, THE Arcane SHALL insert exactly one Notification row for the applicant with `type = 'application_rejected'` and a `payload` field containing `rejection_reason` and `reapply_after` (ISO 8601 date string).
3. THE Arcane SHALL expose the approval and rejection notifications through the existing `NotificationsBell` component in `SiteHeader` so applicants see the notification count increment.
4. IF a Notification insertion fails during an approval or rejection operation, THEN THE Arcane SHALL log the error and complete the status update regardless, so the role change is not blocked by a notification failure.

---

## Correctness Properties

The following properties are suitable for property-based testing of the business logic layer (pure functions and database constraints). They do not involve live Supabase calls; mocks or an in-memory test database should be used.

### Property 1: Role assignment invariant

**For all sign-up events where the user selects role intent R:**
`chosen_intent(user) ∈ {'learn', 'teach'} ∧ stored_role_after_signup(user) = 'student'`

After sign-up, every user has exactly the `student` role regardless of intent. The `instructor` role is never present immediately after sign-up. Intent `'teach'` routes to the application form, not direct role grant.

### Property 2: Application data round-trip

**For all valid application form inputs I:**
`read(insert(I)) = I`

After inserting an application with inputs (expertise, background, portfolio_url, statement), reading the row back must return exactly the same values. No field is silently truncated, transformed, or lost on storage and retrieval.

### Property 3: New application status is always "pending"

**For all newly inserted application rows A:**
`A.status = 'pending'`

Regardless of what a client sends, a freshly inserted `instructor_applications` row must have `status = 'pending'`. This is enforced both by the DB default and the RLS policy preventing client-supplied `status` overrides.

### Property 4: Studio access gate

**For all users U and application states S:**
`S ∈ {pending, null} → has_studio_access(U) = false`
`S = approved → has_role(U, 'instructor') = true → has_studio_access(U) = true`

No user whose most recent application is pending (or who has no approved application) may have the `instructor` role. Studio access is strictly gated by role presence.

### Property 5: Reapplication time window

**For all rejection timestamps T and reapplication attempt timestamps T':**
`T' < T + 30_days → application_accepted(T') = false`
`T' ≥ T + 30_days → application_accepted(T') = true` (assuming no other blocking condition)

The 30-day cooldown function is a pure date comparison. For any pair of (rejected_at, attempt_at) timestamps, the function must return the correct boolean. Property tests should generate timestamps spanning boundary cases (exactly 30 days, 29 days 23 hours, 30 days 1 second).

### Property 6: Application status transition validity

**For all applications A and status transitions (S_old → S_new):**
Valid transitions: `pending → approved`, `pending → rejected`
Invalid transitions: `approved → *`, `rejected → approved`, any `→ pending`

The status field must be a write-once field for the decision. After any non-pending status is set, no further update to `status` should succeed. Property tests can generate arbitrary sequences of update attempts and verify the constraint holds.

### Property 7: At-most-one pending application per user

**For all users U and sets of applications A for U:**
`count({ a ∈ A | a.status = 'pending' }) ≤ 1`

At no point should a user have two concurrent pending applications. A second insert with `status = 'pending'` for the same user must be rejected by the DB unique partial index.

### Property 8: URL validation completeness

**For all portfolio_url inputs S:**
`is_valid_url(S) = true ↔ S matches ^https?://[^\s/$.?#].[^\s]*$`

The URL validator must accept all syntactically valid HTTP/HTTPS URLs and reject all others. Property tests should generate: valid URLs with paths/query params, empty strings, strings without a protocol, strings with ftp:// or other protocols, and random alphanumeric strings.

### Property 9: Admin decision sets both reviewed_at and reviewed_by atomically

**For all admin decisions D = (approve | reject) performed by admin user A at time T:**
`D(application).reviewed_at = T ∧ D(application).reviewed_by = A.user_id`

Both fields are always set together. There is no state in which `reviewed_at` is set without `reviewed_by` or vice versa.
