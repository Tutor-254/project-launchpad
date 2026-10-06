# Requirements Document: Offline and Low-Bandwidth Support

## Introduction

Arcane's value proposition for underserved youth depends on functioning reliably with limited connectivity and data. This feature implements **Progressive Web App (PWA) functionality, offline-first synchronization, and data-efficiency controls** to make the platform accessible on low-cost devices over unstable mobile networks.

The feature includes:
1. Installable PWA with service worker caching
2. Downloadable lessons with compressed media
3. Offline progress tracking and synchronization
4. Low-data mode with quality selectors
5. Shared-device mode with fast learner switching

---

## Glossary

- **PWA**: Progressive Web App; an installable web app that works offline
- **Service Worker**: Browser worker script that intercepts network requests and manages cache
- **Offline-First**: Data is always stored locally first; synchronization is asynchronous
- **Lesson Package**: A downloadable bundle containing lesson text, compressed video, audio, and practice questions
- **Synchronization Queue**: Local storage of pending actions (progress, quiz responses, uploads) waiting for connectivity
- **Low-Data Mode**: Feature that defaults to text/audio, reduces image quality, disables video by default
- **Shared-Device Mode**: Fast learner switching via PIN or short code, automatic logout, no cache leakage between users

---

## Requirements

### Requirement 1: PWA Installability and Manifest

**User Story:** As a learner on a low-cost device, I want to install Arcane as an app so I can access it quickly without relying on a browser.

#### Acceptance Criteria

1. WHEN a learner visits Arcane on a modern mobile browser (iOS 15+, Android 5+), THEY SHALL see an "Install" prompt or be able to add the app to the home screen.
2. THE Arcane application SHALL include a valid Web App Manifest (`public/manifest.json`) with: name, short_name, theme_color, background_color, icons (192px, 512px PNG format), start_url, display mode `standalone`, orientation `portrait`.
3. WHEN the app is installed and launched from the home screen, THE app SHALL display the Arcane name/icon as a native app.
4. THE installed app SHALL work offline for pre-downloaded content (without requiring a network connection).
5. WHEN the app is closed and reopened, THE browser session state (auth token, user ID) SHALL persist from `localStorage`.

---

### Requirement 2: Service Worker and Offline Content Caching

**User Story:** As a learner, I want selected lessons to be downloadable so I can learn without connectivity, even on a device with limited storage.

#### Acceptance Criteria

1. THE application SHALL register a service worker that intercepts all network requests.
2. THE service worker SHALL cache HTML, CSS, JavaScript, and JSON responses with a "cache first" strategy: return from cache if available, else fetch from network and cache.
3. THE service worker SHALL implement a "network first" strategy for critical API calls (authentication, real-time progress) with fallback to cache if network fails.
4. WHEN a learner downloads a lesson package, THE service worker SHALL cache: lesson metadata, video file (pre-compressed), audio file, transcript, practice questions, images.
5. UPON a successful network fetch after offline use, THE service worker SHALL update the cache and mark stale data as synchronizable.
6. THE service worker SHALL NOT cache authentication responses to prevent stale token issues.

---

### Requirement 3: Lesson Download and Offline Package

**User Story:** As a learner with limited data, I want to select individual lessons to download so I know exactly how much data I'm using.

#### Acceptance Criteria

1. ON each course lecture page, THERE SHALL be a "Download for offline" button displaying: estimated file size (in MB), compression level (high/medium), download status (ready, downloading, cached, failed).
2. WHEN a learner clicks the "Download for offline" button, THE application SHALL start downloading: lesson text, transcript, compressed video (480p or user-selected quality), audio track, practice questions.
3. DURING download, THE application SHALL show: progress percentage, current file being downloaded, MB downloaded / MB total, time remaining estimate, and a "Pause" or "Cancel" button.
4. ON successful download, THE application SHALL: mark the lesson as "available offline" in the curriculum, store the download timestamp, display checkmark icon next to the lesson.
5. IF download fails (network loss, storage full), THE application SHALL: pause the download, display the error reason, allow resuming the download when connectivity returns.
6. THE application SHALL NOT re-download files already cached; if a learner re-requests a download, the app SHALL indicate "Already downloaded" and offer only an update option.

---

### Requirement 4: Offline Lecture Playback

**User Story:** As a learner without connectivity, I want to play a downloaded lesson and complete practice questions without an internet connection.

#### Acceptance Criteria

1. WHEN a learner navigates to a downloaded lesson while offline, THE video player SHALL load the cached video without a network request.
2. THE video player SHALL function normally offline: play, pause, seek, speed control (0.75x, 1x, 1.25x, 1.5x), closed captions / transcript toggling.
3. IF the learner is offline, THE practice quiz section SHALL be accessible and functional using only cached question data.
4. WHEN a learner submits a practice quiz response while offline, THE response SHALL be stored locally with a "pending sync" status.
5. WHEN the learner reconnects to the network, ALL pending quiz responses SHALL be automatically submitted to the server and marked as "synced."
6. THE application SHALL display a clear indicator (e.g., "Offline" badge, no signal icon) while offline.

---

### Requirement 5: Offline Progress Synchronization

**User Story:** As a learner using multiple devices, I want my progress to sync reliably when I reconnect, without losing or duplicating data.

#### Acceptance Criteria

1. WHEN a learner marks a lecture as complete offline, THE application SHALL: store the completion status locally, assign it a unique event ID, record the timestamp, and set sync status to "pending."
2. WHEN the learner reconnects to the network, THE application SHALL automatically sync all pending progress events using an event-based model: send a batch of (event_id, lecture_id, completed, timestamp) tuples to the server.
3. THE server SHALL accept and idempotently process each event: if event_id has already been processed, return success without duplicate insertion.
4. IF a sync attempt fails, THE application SHALL: retry with exponential backoff (1s, 2s, 4s, 8s), display "Sync failed—retrying" status, allow manual retry, and queue the event for later retry.
5. WHEN sync succeeds, THE application SHALL: clear the local pending status, update the UI to show "synced," and display a "Last synced at HH:MM" timestamp.
6. IF a learner completes the same lecture on two devices offline and then syncs both, THE server SHALL detect the duplicate event_id and process it only once.

---

### Requirement 6: Low-Data Mode Controls

**User Story:** As a learner with a limited data plan, I want controls to reduce data consumption so I can complete courses without exhausting my data budget.

#### Acceptance Criteria

1. IN user settings (`/settings/data-usage`), THE application SHALL provide a "Low-Data Mode" toggle switch and setting options.
2. WHEN "Low-Data Mode" is enabled, THE application SHALL:
   - Default video playback to **audio only** (or 240p if video is essential)
   - Disable auto-play of videos
   - Strip images from lesson descriptions (show alt text only)
   - Disable video thumbnails in course catalog
   - Block animation / video backgrounds
3. WHEN a learner visits a course page, THE video player SHALL display a "Video Quality" selector (if not in low-data mode): 1080p, 720p, 480p, 240p, or audio-only.
4. THE application SHALL estimate and display data usage **before download**: "Downloading this lesson will use ~45 MB. Your plan has 500 MB remaining."
5. IN settings, THE application SHALL show a "Data Usage History" chart: MB consumed per course, per week, lifetime usage, and remaining data budget (if manually set by user).
6. THE application SHALL provide an option to "Download over Wi-Fi only" and prevent cellular downloads if enabled.

---

### Requirement 7: Shared-Device Mode

**User Story:** As a facilitator managing a shared tablet, I want to let different learners use the same device without exposing one learner's progress or personal data to another.

#### Acceptance Criteria

1. IN settings, THERE SHALL be a "Device Sharing" option for facilitators to enable "Shared-Device Mode."
2. WHEN "Shared-Device Mode" is enabled, INSTEAD of email login, THE login screen SHALL show: a login method selector (phone number or 4-digit PIN option), learner name, and last-login date.
3. WHEN a learner uses a 4-digit PIN login on a shared device, THE system SHALL: create a unique session per PIN, display "logged in as [learner_name]" in the UI, and set an inactivity timeout (5 minutes by default).
4. UPON inactivity timeout, THE application SHALL: automatically log out, clear the local cache for that learner, display the login screen, and prepare for the next learner.
5. THE application SHALL provide a "Switch learner" button in the user menu that triggers immediate logout and clears all cached personal data (progress, responses, preferences) for the previous learner.
6. WHEN one learner logs out (or times out), THE next learner's login session SHALL NOT expose the previous learner's name, progress, or messages.
7. THE application SHALL support up to 5 different learner accounts per shared device with separate caches.

---

### Requirement 8: Resumable Uploads for Assignments

**User Story:** As a learner with an unstable connection, I want to be able to upload an assignment file, pause if the connection drops, and resume without re-uploading the entire file.

#### Acceptance Criteria

1. IN the assignment submission form, WHEN a learner selects a file to upload, THE application SHALL: display file size (in MB), estimated upload time at current speed, and an "Upload" button.
2. WHEN upload begins, THE application SHALL: show progress percentage, current speed (MB/s), time remaining, and a "Pause" button.
3. IF the connection drops during upload, THE application SHALL: pause the upload automatically, display "Upload paused—retrying," and queue the upload for resumption.
4. WHEN the connection is restored, THE application SHALL resume the upload from the last successful byte (not from the beginning).
5. IF upload resumes, THE user SHALL see: "Resuming upload, 65% complete" (showing where it left off).
6. UPON successful upload completion, THE application SHALL display "Upload complete," verify file integrity with a server checksum, and display a checkmark.

---

### Requirement 9: Offline Synchronization Status Dashboard

**User Story:** As a learner, I want to see exactly what is cached offline, what is pending sync, and what syncing progress is happening.

#### Acceptance Criteria

1. IN the user dashboard (`/learn`), THERE SHALL be an "Offline & Sync Status" card displaying:
   - "Downloaded lessons": count of offline-ready lessons
   - "Total cache size": MB of data stored locally
   - "Pending sync": count of pending progress events / quiz responses
   - Last sync time (e.g., "Synced 2 minutes ago")
2. THE card SHALL show a sync status bar: green (all synced), yellow (syncing in progress), red (sync failed, manual retry available).
3. WHEN a learner taps the card, IT SHALL open a detailed view showing:
   - List of downloaded lessons by course with size and last-accessed date
   - List of pending actions (quiz response, progress, uploads) with timestamp
   - "Sync now" button to trigger manual synchronization
   - "Clear cache" button (with confirmation) to delete all offline data and free storage
4. THE dashboard SHALL update in real-time as downloads, syncs, and cache clears complete.

---

## Correctness Properties

### Property 1: Offline-first event storage

**For all learner actions while offline:**
`action_timestamp <= now ∧ sync_status(action) = 'pending' ∧ action_stored_locally = true`

Actions are always stored locally before any attempt to sync. No action is lost because sync failed.

### Property 2: Idempotent synchronization

**For all sync operations:**
`sync(event_id_set) = sync(event_id_set ∪ {duplicate_event_id})`

Syncing the same event twice produces the same result as syncing it once. The server rejects duplicate event_ids.

### Property 3: Service worker cache miss fallback

**For all network requests in offline mode:**
`cache_available(request) ∨ offline_fallback_displayed = true`

If cache is unavailable and offline, a user-friendly fallback message is shown (not a broken error).

### Property 4: Resumable upload byte-accuracy

**For all resumed uploads:**
`bytes_sent_before_pause + bytes_sent_after_resume = total_file_bytes`

Upload resumes from the exact byte position where it paused. No bytes are duplicated or skipped.

### Property 5: Learner data isolation on shared devices

**For all shared-device sessions S1, S2 where S1 ≠ S2:**
`local_cache(S1) ∩ local_cache(S2) = ∅`

Session caches are completely isolated; learner 1 cannot see learner 2's data even if they share the same device.

### Property 6: Lesson download completeness

**For all downloaded lesson packages L:**
`has(L, video) ∧ has(L, audio) ∧ has(L, transcript) ∧ has(L, questions) ∧ has(L, metadata)`

All components of a lesson (video, audio, transcript, questions, metadata) are downloaded together. No partial packages.

---

## Acceptance Criteria Summary

| Feature | P0/P1 | Key Metric |
|---------|-------|-----------|
| PWA installability | P0 | Users can install and launch from home screen |
| Offline lesson download | P0 | Selected lessons playable without network |
| Offline progress sync | P0 | 100% sync success after reconnect, no duplicates |
| Low-data mode | P0 | Median 85% data savings in low-data mode vs. default |
| Shared-device switching | P0/P1 | < 5s to switch between learners, zero data leakage |
| Resumable uploads | P1 | Failed uploads resume from pause point |
| Data usage visibility | P0 | Users see estimated and actual MB per lesson |

