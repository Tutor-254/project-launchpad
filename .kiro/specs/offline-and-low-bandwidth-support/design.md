# Design Document: Offline and Low-Bandwidth Support

## Architecture Overview

The offline-first system is built on three layers:

1. **Service Worker Layer** — Intercepts network requests, manages cache, offline detection
2. **Local Storage Layer** — IndexedDB for progress events and sync queue; localStorage for user settings
3. **Synchronization Layer** — Event-based sync engine, conflict resolution, retry logic

---

## 1. Service Worker Strategy

### Cache Strategy by Request Type

| Request Type | Strategy | TTL | Fallback |
|--------------|----------|-----|----------|
| HTML (app shell) | Cache first, update background | 30 days | Offline page |
| CSS / JS / static | Cache first, immutable | 365 days | Blank page |
| API: course catalog | Network first, 5s timeout | 7 days | Cached version |
| API: progress sync | Network only | N/A | Queued locally, retry on reconnect |
| API: auth check | Network only | N/A | Assume offline, reject |
| Video files | Cache first (user-initiated) | 365 days | Show "not cached" |
| Images (adaptive) | Cache first, size-limited | 30 days | Alt text only |

### Service Worker Lifecycle

```typescript
// Install: precache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell());
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupOldCaches());
});

// Fetch: route requests based on type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (isVideoRequest(url)) {
    return cacheFirstStrategy(event);
  } else if (isApiRequest(url)) {
    return networkFirstStrategy(event, 5000); // 5s timeout
  } else if (isAuthRequest(url)) {
    return networkOnlyStrategy(event);
  } else {
    return cacheFirstStrategy(event);
  }
});
```

---

## 2. Lesson Download and Caching

### Lesson Package Structure

```typescript
interface LessonPackage {
  lecture_id: string;
  course_id: string;
  metadata: {
    title: string;
    duration_seconds: number;
    created_at: string;
    version: string;
  };
  video: {
    url: string;
    quality: '240p' | '480p' | '720p' | '1080p';
    size_bytes: number;
    mime_type: 'video/mp4';
  };
  audio?: {
    url: string;
    size_bytes: number;
    mime_type: 'audio/mp3';
  };
  transcript: {
    content: string;
    language: 'en' | 'sw';
  };
  questions: {
    id: string;
    type: 'multiple_choice' | 'short_answer';
    question_text: string;
    options?: string[];
    correct_answer?: string;
  }[];
  images?: {
    url: string;
    alt_text: string;
    size_bytes: number;
  }[];
}
```

### Download Manager

```typescript
class LessonDownloadManager {
  async downloadLesson(
    lectureId: string,
    options: { quality: '240p' | '480p' | '720p'; audioOnly?: boolean }
  ): Promise<void> {
    // 1. Fetch lesson metadata
    const pkg = await this.fetchLessonPackage(lectureId);
    
    // 2. Calculate total size with user's selected quality
    const totalSize = this.calculateSize(pkg, options);
    
    // 3. Check local storage available
    const available = await this.getAvailableStorage();
    if (totalSize > available) {
      throw new Error(`Insufficient storage. Need ${totalSize}MB, have ${available}MB`);
    }
    
    // 4. Download each component, storing download resumption points
    const downloads = [
      this.downloadBlob(pkg.video.url, `video_${lectureId}`, options.quality),
      ...(options.audioOnly ? [] : [this.downloadBlob(pkg.audio?.url, `audio_${lectureId}`)]),
      this.storeJSON(`questions_${lectureId}`, pkg.questions),
    ];
    
    // 5. Handle failures with resumable queue
    await Promise.allSettled(downloads.map(d => 
      d.catch((err) => this.queueResumeDownload(lectureId, err))
    ));
  }
}
```

---

## 3. Offline Progress Synchronization

### Event Model

```typescript
interface ProgressEvent {
  event_id: string; // UUIDv4, unique per action
  user_id: string;
  lecture_id: string;
  action: 'lecture_completed' | 'quiz_submitted' | 'upload_queued';
  payload: {
    timestamp: ISO8601;
    seconds_watched?: number;
    quiz_responses?: Record<string, string>;
    upload_id?: string;
  };
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  created_at: ISO8601;
  synced_at?: ISO8601;
}
```

### Sync Engine

```typescript
class SyncEngine {
  async sync(): Promise<SyncResult> {
    // 1. Check connectivity
    if (!navigator.onLine) {
      return { status: 'offline', queued: await this.getPendingCount() };
    }
    
    // 2. Fetch all pending events
    const pending = await this.db.query({
      where: { sync_status: { in: ['pending', 'failed'] } }
    });
    
    if (pending.length === 0) return { status: 'synced', count: 0 };
    
    // 3. Send in batch (max 100 events per request)
    for (const batch of chunks(pending, 100)) {
      const result = await supabase.rpc('sync_progress_events', {
        events: batch,
      });
      
      if (result.error) {
        // Mark as failed, retry with exponential backoff
        await this.db.update(
          { id: { in: batch.map(b => b.id) } },
          { sync_status: 'failed', retry_after: now + backoff(failCount) }
        );
        continue;
      }
      
      // 4. Mark as synced
      await this.db.update(
        { id: { in: batch.map(b => b.id) } },
        { sync_status: 'synced', synced_at: now }
      );
    }
    
    return { status: 'synced', count: pending.length };
  }
}
```

---

## 4. Low-Data Mode

### Data Usage Estimator

```typescript
interface DataUsageEstimate {
  lesson_id: string;
  mode: 'default' | 'low-data';
  video_quality: '1080p' | '720p' | '480p' | '240p' | 'audio-only';
  estimated_bytes: number;
  breakdown: {
    video_bytes: number;
    audio_bytes: number;
    text_bytes: number;
    images_bytes: number;
  };
}

function estimateDataUsage(
  lesson: LessonMetadata,
  mode: 'default' | 'low-data'
): DataUsageEstimate {
  let videoBytes = 0;
  if (mode === 'low-data') {
    videoBytes = lesson.video_size_by_quality['240p'] ?? 0;
  } else {
    videoBytes = lesson.video_size_by_quality['1080p'] ?? 0;
  }
  
  const audioBytes = lesson.audio_size ?? 0;
  const imageBytes = mode === 'low-data' ? 0 : (lesson.images_size ?? 0);
  const textBytes = lesson.text_size ?? 0;
  
  return {
    estimated_bytes: videoBytes + audioBytes + imageBytes + textBytes,
    breakdown: { videoBytes, audioBytes, imageBytes, textBytes },
  };
}
```

### Low-Data Mode Settings

```typescript
interface LowDataSettings {
  enabled: boolean;
  video_quality: '240p' | '480p' | 'audio-only';
  auto_play: boolean;
  images_enabled: boolean;
  download_over_wifi_only: boolean;
  data_budget_mb?: number;
}
```

---

## 5. Shared-Device Mode

### Session Management

```typescript
interface SharedDeviceSession {
  session_id: string;
  pin: string; // 4-digit PIN
  learner_name: string;
  learner_id: string;
  device_id: string;
  inactivity_timeout_seconds: number;
  started_at: ISO8601;
  expires_at: ISO8601;
  cache_namespace: `session_${session_id}`; // Isolated cache per session
}

class SharedDeviceSessionManager {
  async createSession(pin: string, learnerId: string): Promise<SharedDeviceSession> {
    const session: SharedDeviceSession = {
      session_id: generateUUID(),
      pin: hashPIN(pin), // Never store plaintext PINs
      learner_id: learnerId,
      device_id: await getDeviceId(),
      inactivity_timeout_seconds: 300,
      cache_namespace: `session_${generateUUID()}`,
      started_at: now(),
      expires_at: now() + 12_hours,
    };
    
    // Store session in secure localStorage (HTTPOnly not possible in browser)
    localStorage.setItem(`session_${session.session_id}`, JSON.stringify(session));
    
    // Start inactivity timer
    this.startInactivityTimer(session);
    
    return session;
  }
  
  async switchLearner(newPin: string): Promise<SharedDeviceSession> {
    // 1. Get current session
    const current = this.getCurrentSession();
    
    // 2. Clear current session cache
    await this.clearSessionCache(current.cache_namespace);
    
    // 3. Logout current learner
    localStorage.removeItem(`session_${current.session_id}`);
    
    // 4. Create new session with new PIN
    const newSession = await this.createSession(newPin, ???); // PIN -> learner lookup
    
    return newSession;
  }
}
```

---

## 6. Database Schema Extensions

```sql
-- New tables for offline support

CREATE TABLE offline_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  lecture_id uuid NOT NULL REFERENCES lectures(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('completed', 'quiz_submitted', 'upload_queued')),
  payload jsonb NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  retry_after TIMESTAMPTZ,
  UNIQUE(id) -- Idempotency key for sync
);

CREATE TABLE offline_lesson_caches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  lecture_id uuid NOT NULL REFERENCES lectures(id),
  video_quality TEXT CHECK (video_quality IN ('240p', '480p', '720p', '1080p')),
  audio_only BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT now(),
  size_bytes BIGINT,
  
  UNIQUE(user_id, lecture_id, video_quality)
);

CREATE TABLE shared_device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash VARCHAR(255) NOT NULL,
  learner_id uuid NOT NULL REFERENCES profiles(id),
  device_id VARCHAR(255) NOT NULL,
  inactivity_timeout_seconds INT DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotency: duplicate progress events are ignored
CREATE UNIQUE INDEX ON offline_progress_events (id) WHERE sync_status != 'failed';
```

---

## 7. Network State and Reconnection Handling

```typescript
class OfflineDetector {
  private listeners: ((isOnline: boolean) => void)[] = [];
  
  constructor() {
    window.addEventListener('online', () => this.notifyOnline());
    window.addEventListener('offline', () => this.notifyOffline());
  }
  
  private notifyOnline() {
    console.log('[Offline] Device came online');
    
    // 1. Trigger sync
    syncEngine.sync();
    
    // 2. Refresh any stale data (catalog, user profile)
    queryClient.invalidateQueries({ queryKey: ['courses'] });
    
    // 3. Notify listeners
    this.listeners.forEach(fn => fn(true));
  }
  
  isOnline(): boolean {
    return navigator.onLine;
  }
}
```

---

## 8. React Components and Hooks

### `useOfflineStatus`

```typescript
function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const detector = new OfflineDetector();
    detector.on('online', () => setIsOnline(true));
    detector.on('offline', () => setIsOnline(false));
  }, []);
  
  return { isOnline };
}
```

### `<LessonDownloadButton>`

```typescript
export function LessonDownloadButton({ lectureId }: { lectureId: string }) {
  const [progress, setProgress] = useState<{ percent: number; status: 'ready' | 'downloading' | 'cached' | 'failed' }>();
  
  async function handleDownload() {
    const manager = new LessonDownloadManager();
    manager.on('progress', (percent) => setProgress({ percent, status: 'downloading' }));
    
    await manager.downloadLesson(lectureId, { quality: '480p' });
    setProgress({ percent: 100, status: 'cached' });
  }
  
  return (
    <Button onClick={handleDownload} disabled={progress?.status === 'downloading'}>
      Download for offline
    </Button>
  );
}
```

---

## 9. Implementation Roadmap

### Phase 1 (Weeks 1-2): Service Worker & Offline App Shell
- Service worker registration, cache strategy
- PWA manifest and installation prompt
- App shell precaching

### Phase 2 (Weeks 3-4): Offline Lesson Playback
- Lesson download manager
- Video player offline support
- Practice quiz offline support

### Phase 3 (Weeks 5-6): Synchronization Engine
- Progress event model and storage
- Sync engine with retry logic
- Conflict resolution

### Phase 4 (Week 7): Low-Data Mode & Shared Device
- Low-data mode controls and estimator
- Shared-device session management

### Phase 5 (Week 8): Dashboard & Testing
- Offline status dashboard
- Comprehensive testing and optimization

