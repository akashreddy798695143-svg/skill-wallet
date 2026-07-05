# API Reference — Voice-Based Connect

All endpoints are served under `/api` by Next.js 16 Route Handlers. The server runs on port `3000` by default (`bun run dev`).

## Conventions

| Aspect | Convention |
| --- | --- |
| Base URL | `http://localhost:3000/api` |
| Auth mechanism | HTTP-only cookie `vbc_session` (set by login/register) |
| Request bodies | JSON unless noted (multipart for `/audio` upload) |
| Response bodies | JSON, except `/audio/[id]` and `/tts` which return binary audio |
| Error shape | `{ "error": "<message>" }` with the appropriate HTTP status |
| Auth levels | **none** · **user** (any authenticated account) · **admin** (`role === "ADMIN"`) |
| Date format | ISO-8601 strings |

### Authentication

Authenticated requests rely on the cookie set by `POST /api/auth/login` or `POST /api/auth/register`. With `curl` use `-b cookie.jar -c cookie.jar` to persist the cookie across requests.

---

## 1. Auth

### 1.1 Register

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/auth/register` |
| Auth | none |

**Request body**
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "secret123" }
```

Validation:
- `name` ≥ 2 chars
- `email` matches a basic email regex
- `password` ≥ 6 chars
- email must not already exist
- The first registered user becomes `ADMIN`; all others are `USER`.

**Response `201`**
```json
{
  "user": {
    "id": "clx...",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "role": "ADMIN",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```
The response also sets the `vbc_session` cookie.

**curl**
```bash
curl -c cookie.jar -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"secret123"}' \
  http://localhost:3000/api/auth/register
```

---

### 1.2 Login

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/auth/login` |
| Auth | none |

**Request body**
```json
{ "email": "ada@example.com", "password": "secret123" }
```

A `LoginHistory` row is recorded for every attempt (success or failure) with IP + user-agent. Missing-user and wrong-password cases return the same generic message to avoid email enumeration.

**Response `200`**
```json
{
  "user": { "id": "clx...", "email": "ada@example.com", "name": "Ada", "role": "ADMIN", "createdAt": "..." }
}
```
Sets `vbc_session` cookie (HttpOnly, SameSite=Lax, 7-day TTL, Secure in production).

**curl**
```bash
curl -c cookie.jar -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"secret123"}' \
  http://localhost:3000/api/auth/login
```

---

### 1.3 Logout

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/auth/logout` |
| Auth | none (clears the cookie regardless) |

**Request body** — none.

**Response `200`**
```json
{ "ok": true }
```
Sets `vbc_session=; Max-Age=0` to delete the cookie.

**curl**
```bash
curl -b cookie.jar -c cookie.jar -X POST http://localhost:3000/api/auth/logout
```

---

### 1.4 Current user

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/auth/me` |
| Auth | user |

**Response `200`**
```json
{ "id": "clx...", "email": "ada@example.com", "name": "Ada", "role": "ADMIN", "createdAt": "..." }
```
**Response `401`** — `{ "error": "Not authenticated" }` when no valid cookie is present.

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/auth/me
```

---

### 1.5 Forgot password

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/auth/forgot-password` |
| Auth | none |

**Request body**
```json
{ "email": "ada@example.com" }
```

Always returns `200` to avoid leaking which emails exist. If the email exists, a 1-hour reset JWT is generated, stored on the user (`resetToken`, `resetTokenExpiry`), and — in this sandbox — returned in the JSON body for convenience (production should email it).

**Response `200`**
```json
{ "ok": true, "resetToken": "eyJ...", "message": "Reset token generated." }
```

**curl**
```bash
curl -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com"}' \
  http://localhost:3000/api/auth/forgot-password
```

---

### 1.6 Reset password

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/auth/reset-password` |
| Auth | none (token-based) |

**Request body**
```json
{ "token": "eyJ...", "password": "newSecret123" }
```

Validation:
- `token` and `password` (≥ 6 chars) required
- token must verify with `jose` and contain `purpose: "reset"`
- stored `resetToken` must match and `resetTokenExpiry` must not be in the past

**Response `200`**
```json
{ "ok": true, "message": "Password reset successfully." }
```

**curl**
```bash
curl -H 'Content-Type: application/json' \
  -d '{"token":"eyJ...","password":"newSecret123"}' \
  http://localhost:3000/api/auth/reset-password
```

---

## 2. Audio

### 2.1 List audio files

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/audio` |
| Auth | user |

Returns up to 50 of the current user's audio files, newest first.

**Response `200`**
```json
{
  "files": [
    {
      "id": "clx...",
      "originalName": "interview.wav",
      "mimeType": "audio/wav",
      "size": 1024000,
      "durationSec": 12.5,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/audio
```

---

### 2.2 Upload audio file

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/audio` |
| Auth | user |
| Body | `multipart/form-data` with field `file` |

Validations:
- MIME type or extension must be in the allow-list: WAV, MP3, M4A, AAC, OGG, WEBM
- File size ≤ 25 MB

The file is written to `uploads/<timestamp>-<uuid>.<ext>`; the WAV duration is estimated from the header. An `AudioFile` row is inserted.

**Response `201`**
```json
{
  "file": {
    "id": "clx...",
    "originalName": "interview.wav",
    "mimeType": "audio/wav",
    "size": 1024000,
    "durationSec": 12.5,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**curl**
```bash
curl -b cookie.jar -F 'file=@./interview.wav' http://localhost:3000/api/audio
```

---

### 2.3 Get / download an audio file

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/audio/{id}` |
| Auth | user (owner only) |
| Query | `?download=1` to force `Content-Disposition: attachment` |

Returns the raw audio bytes with the correct `Content-Type`. Returns `404` if the file does not exist or belongs to another user.

**Response `200`** — binary body with headers:
```
Content-Type: audio/wav
Content-Length: 1024000
Content-Disposition: inline | attachment; filename="interview.wav"
Cache-Control: private, max-age=0, no-cache
```

**curl**
```bash
# Stream to a file
curl -b cookie.jar http://localhost:3000/api/audio/clx... -o out.wav
# Force download
curl -b cookie.jar 'http://localhost:3000/api/audio/clx...?download=1' -o out.wav
```

---

### 2.4 Delete an audio file

| | |
| --- | --- |
| Method | `DELETE` |
| Path | `/api/audio/{id}` |
| Auth | user (owner only) |

Removes the disk artifact (best-effort) and the `AudioFile` row. Existing sessions referencing this audio keep their `audioFileId` set to NULL via the `SetNull` foreign-key rule.

**Response `200`**
```json
{ "ok": true }
```

**curl**
```bash
curl -b cookie.jar -X DELETE http://localhost:3000/api/audio/clx...
```

---

## 3. Sessions

### 3.1 List sessions

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/sessions` |
| Auth | user |

Query parameters (all optional):

| Param | Default | Meaning |
| --- | --- | --- |
| `search` | `""` | Matches `title` or transcript text |
| `rating` | `""` | One of `Excellent`, `Good`, `Average`, `Needs Improvement` |
| `emotion` | `""` | One of `happy`, `sad`, `angry`, `neutral`, `fear`, `surprise` |
| `sort` | `newest` | `newest` · `oldest` · `best` (overallSpeaking desc) · `worst` (overallSpeaking asc) |

Returns up to 200 sessions for the current user, including transcript preview, emotion, rating, overall score, and audio file metadata.

**Response `200`**
```json
{
  "sessions": [
    {
      "id": "clx...",
      "title": "interview.wav",
      "durationSec": 12.5,
      "language": "en",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "emotion": "happy",
      "rating": "Good",
      "overallSpeaking": 78,
      "transcriptPreview": "Hello, my name is Ada and I'm applying for...",
      "audioFile": {
        "id": "clx...",
        "originalName": "interview.wav",
        "mimeType": "audio/wav",
        "size": 1024000,
        "durationSec": 12.5,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

**curl**
```bash
curl -b cookie.jar 'http://localhost:3000/api/sessions?sort=best&emotion=happy'
```

---

### 3.2 Create a session

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/sessions` |
| Auth | user |

**Request body**
```json
{ "audioFileId": "clx...", "title": "Mock interview #1" }
```
`title` is optional and defaults to the audio file's original name.

**Response `201`**
```json
{
  "session": { "id": "clx...", "title": "Mock interview #1", "createdAt": "2025-01-01T00:00:00.000Z" }
}
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"audioFileId":"clx...","title":"Mock interview #1"}' \
  http://localhost:3000/api/sessions
```

---

### 3.3 Get session detail

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/sessions/{id}` |
| Auth | user (owner only) |

Returns the session with all related analyses (transcript, emotion, speaker verification, quality, evaluation, report) included.

**Response `200`**
```json
{
  "session": {
    "id": "clx...",
    "title": "Mock interview #1",
    "durationSec": 12.5,
    "language": "en",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "emotion": "happy",
    "rating": "Good",
    "overallSpeaking": 78,
    "transcriptPreview": "Hello, my name is...",
    "audioFile": { "id": "clx...", "originalName": "interview.wav", "mimeType": "audio/wav", "size": 1024000, "durationSec": 12.5, "createdAt": "..." },
    "transcript":    { "text": "Hello, my name is Ada...", "language": "en", "wordCount": 42, "charCount": 220 },
    "emotionResult": { "emotion": "happy", "confidence": 72, "scores": { "happy": 72, "sad": 4, "angry": 6, "neutral": 10, "fear": 3, "surprise": 5 } },
    "speakerVerification": { "matchPercent": 84, "verified": true, "confidence": 70, "notes": "Likely same speaker." },
    "qualityAnalysis": { "backgroundNoise": 18, "pitch": 178, "volume": 64, "speakingSpeed": 142, "clarity": 80, "pronunciationScore": 76, "pauses": 3, "pauseDurationSec": 1.2, "fluencyScore": 78, "confidenceScore": 74, "grammarScore": 82, "vocabularyScore": 70 },
    "evaluationScore": { "pronunciation": 76, "grammar": 82, "communication": 80, "confidence": 74, "vocabulary": 70, "fluency": 78, "overallInterview": 79, "overallSpeaking": 77, "rating": "Good" },
    "report": {
      "summary": "Clear delivery with good grammar and pacing.",
      "feedback": {
        "strengths": ["..."], "weaknesses": ["..."], "improvementTips": ["..."],
        "recommendedPractice": ["..."], "pronunciationSuggestions": ["..."],
        "vocabularySuggestions": ["..."], "grammarCorrections": ["..."]
      }
    }
  }
}
```

Any analysis section that has not been run yet is simply omitted (`undefined` in the JSON).

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/sessions/clx...
```

---

### 3.4 Delete a session

| | |
| --- | --- |
| Method | `DELETE` |
| Path | `/api/sessions/{id}` |
| Auth | user (owner only) |

Cascades to Transcript, EmotionResult, SpeakerVerification, QualityAnalysis, EvaluationScore, and Report. The linked AudioFile is left intact (only the FK link is removed).

**Response `200`**
```json
{ "ok": true }
```

**curl**
```bash
curl -b cookie.jar -X DELETE http://localhost:3000/api/sessions/clx...
```

---

## 4. AI Analysis

> All AI routes **upsert** their result. Calling the same route twice on the same session replaces the previous analysis.

### 4.1 Transcribe (ASR)

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/asr` |
| Auth | user |

Reads the session's audio file from disk, calls `zai.audio.asr.create` with a base64-encoded payload, and stores the returned text in the `Transcript` table. If ASR returns an empty string, the transcript is set to `"(No speech detected.)"`.

**Request body**
```json
{ "sessionId": "clx..." }
```

**Response `200`**
```json
{ "transcript": { "text": "Hello, my name is Ada...", "language": "en", "wordCount": 42, "charCount": 220 } }
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"sessionId":"clx..."}' http://localhost:3000/api/asr
```

---

### 4.2 Emotion detection

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/emotion` |
| Auth | user |
| Precondition | Session must already have a transcript |

**Request body**
```json
{ "sessionId": "clx..." }
```

**Response `200`**
```json
{ "emotion": { "emotion": "happy", "confidence": 72, "scores": { "happy": 72, "sad": 4, "angry": 6, "neutral": 10, "fear": 3, "surprise": 5 } } }
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"sessionId":"clx..."}' http://localhost:3000/api/emotion
```

---

### 4.3 Audio quality analysis

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/quality` |
| Auth | user |
| Precondition | Session must already have a transcript |

Combines server-computed metrics (WPM derived from transcript + duration) with **client-measured** audio metrics (volume, background noise, pitch, duration) submitted by the Studio UI's Web Audio API extraction.

**Request body**
```json
{
  "sessionId": "clx...",
  "metrics": { "volume": 64, "backgroundNoise": 18, "pitch": 178, "durationSec": 12.5 }
}
```

`metrics` is optional — sensible defaults are applied if omitted.

**Response `200`**
```json
{
  "quality": {
    "backgroundNoise": 18, "pitch": 178, "volume": 64, "speakingSpeed": 142,
    "clarity": 80, "pronunciationScore": 76, "pauses": 3, "pauseDurationSec": 1.2,
    "fluencyScore": 78, "confidenceScore": 74, "grammarScore": 82, "vocabularyScore": 70
  }
}
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"sessionId":"clx...","metrics":{"volume":64,"backgroundNoise":18,"pitch":178,"durationSec":12.5}}' \
  http://localhost:3000/api/quality
```

---

### 4.4 Speaker verification

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/speaker-verify` |
| Auth | user |
| Precondition | Session must already have a transcript |

Reads the reference audio from disk, transcribes it via ASR, then asks the LLM to estimate a speaker-match percentage based on wording, phrasing style and vocabulary overlap (with a Jaccard-similarity fallback).

**Request body**
```json
{ "sessionId": "clx...", "referenceAudioId": "clx..." }
```

**Response `200`**
```json
{ "verification": { "matchPercent": 84, "verified": true, "confidence": 70, "notes": "Likely same speaker." } }
```
`verified` is `true` when `matchPercent >= 60`.

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"sessionId":"clx...","referenceAudioId":"clx..."}' \
  http://localhost:3000/api/speaker-verify
```

---

### 4.5 AI evaluation + feedback

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/evaluate` |
| Auth | user |
| Precondition | Session must already have a transcript AND a quality analysis |

Runs a single LLM call that produces both a numeric `EvaluationScore` (6 sub-scores + overall interview + overall speaking + rating) and a `Report` (summary + structured feedback).

**Request body**
```json
{ "sessionId": "clx..." }
```

**Response `200`**
```json
{
  "evaluation": {
    "pronunciation": 76, "grammar": 82, "communication": 80, "confidence": 74,
    "vocabulary": 70, "fluency": 78, "overallInterview": 79, "overallSpeaking": 77,
    "rating": "Good"
  },
  "report": {
    "summary": "Clear delivery with good grammar and pacing.",
    "feedback": {
      "strengths": ["..."], "weaknesses": ["..."], "improvementTips": ["..."],
      "recommendedPractice": ["..."], "pronunciationSuggestions": ["..."],
      "vocabularySuggestions": ["..."], "grammarCorrections": ["..."]
    }
  }
}
```

The `rating` is derived from `overallSpeaking`: `≥85` Excellent, `≥70` Good, `≥50` Average, else `Needs Improvement`.

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"sessionId":"clx..."}' http://localhost:3000/api/evaluate
```

---

## 5. Text-to-Speech

### 5.1 Generate speech

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/tts` |
| Auth | user |
| Response | Binary audio |

Calls `zai.audio.tts.create`. Long input (>1000 chars) is auto-chunked on sentence boundaries and the resulting audio buffers are concatenated. Available voices: `tongtong`, `chuichui`, `xiaochen`, `jam`, `kazi`, `douji`, `luodo`.

**Request body**
```json
{ "text": "Hello, welcome to Voice-Based Connect.", "voice": "tongtong", "speed": 1.0, "format": "wav" }
```
- `text` is required, max 4000 chars
- `voice` defaults to `"tongtong"`
- `speed` clamped to 0.5 – 2.0, default `1.0`
- `format` is `"wav"` (default) or `"mp3"`

**Response `200`** — binary audio with headers:
```
Content-Type: audio/wav (or audio/mpeg)
Content-Length: <bytes>
Cache-Control: no-cache
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"text":"Hello world","voice":"tongtong","speed":1.0,"format":"wav"}' \
  http://localhost:3000/api/tts -o out.wav
```

---

## 6. Dashboard

### 6.1 User analytics

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/dashboard` |
| Auth | user |

Aggregates up to 500 of the user's sessions into summary statistics and time-series buckets for the dashboard charts.

**Response `200`**
```json
{
  "totalSessions": 24,
  "averageScore": 72,
  "highestScore": 91,
  "emotionHistory": [
    { "emotion": "happy", "count": 12 },
    { "emotion": "neutral", "count": 7 }
  ],
  "speechHistory": [
    { "date": "2025-01-01T00:00:00.000Z", "score": 78, "rating": "Good" }
  ],
  "weeklyPerformance": [
    { "week": "W1", "score": 70, "sessions": 3 }
  ],
  "monthlyPerformance": [
    { "month": "Jan", "score": 72, "sessions": 12 }
  ],
  "ratingDistribution": [
    { "rating": "Excellent", "count": 4 },
    { "rating": "Good", "count": 10 },
    { "rating": "Average", "count": 8 },
    { "rating": "Needs Improvement", "count": 2 }
  ],
  "scoreTrend": [
    { "date": "2025-01-01T00:00:00.000Z", "score": 78 }
  ]
}
```
`weeklyPerformance` covers the last 8 weeks; `monthlyPerformance` covers the last 6 months; `scoreTrend` is the most recent 20 scored sessions.

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/dashboard
```

---

## 7. Export

### 7.1 Export sessions as CSV

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/export` |
| Auth | user |
| Query | `?format=csv` (only `csv` is supported) |

Streams the user's sessions (newest first) as a CSV file.

CSV columns:
```
id, title, createdAt, durationSec, language, emotion, emotionConfidence,
pronunciation, grammar, communication, confidence, vocabulary, fluency,
overallInterview, overallSpeaking, rating, transcript
```

Cells containing `,`, `"`, or newlines are double-quoted with embedded `"` doubled.

**Response `200`** — `text/csv; charset=utf-8` body with:
```
Content-Disposition: attachment; filename="voice-connect-sessions-<timestamp>.csv"
```

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/export?format=csv -o sessions.csv
```

> PDF export is performed **client-side** (the History view opens a print-optimized report window and invokes the browser's print-to-PDF dialog); there is no server-side PDF endpoint.

---

## 8. Admin

All `/api/admin/*` routes require `role === "ADMIN"` (`requireAdmin()`). They return `401` if unauthenticated and `403` if the user is not an admin.

### 8.1 System statistics

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/admin/stats` |
| Auth | admin |

Returns system-wide totals, aggregate rating distribution, the 10 most recent sessions across all users, and the 20 most recent login-audit rows.

**Response `200`**
```json
{
  "totals": { "users": 12, "admins": 1, "sessions": 142, "audioFiles": 88, "transcripts": 130, "reports": 95 },
  "averageScore": 71,
  "ratingDistribution": [
    { "rating": "Excellent", "count": 18 },
    { "rating": "Good", "count": 60 },
    { "rating": "Average", "count": 50 },
    { "rating": "Needs Improvement", "count": 14 }
  ],
  "recentSessions": [
    {
      "id": "clx...",
      "title": "Mock interview #3",
      "createdAt": "2025-01-02T00:00:00.000Z",
      "user": { "name": "Ada", "email": "ada@example.com" },
      "rating": "Good",
      "overallSpeaking": 78,
      "emotion": "happy"
    }
  ],
  "loginHistory": [
    { "id": "clx...", "email": "ada@example.com", "success": true, "ipAddress": "127.0.0.1", "createdAt": "2025-01-02T00:00:00.000Z" }
  ]
}
```

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/admin/stats
```

---

### 8.2 List users

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api/admin/users` |
| Auth | admin |

Returns all users (newest first) with their session counts.

**Response `200`**
```json
{
  "users": [
    { "id": "clx...", "name": "Ada", "email": "ada@example.com", "role": "ADMIN", "createdAt": "...", "sessionCount": 24 }
  ]
}
```

**curl**
```bash
curl -b cookie.jar http://localhost:3000/api/admin/users
```

---

### 8.3 Promote / demote a user

| | |
| --- | --- |
| Method | `POST` |
| Path | `/api/admin/users` |
| Auth | admin |

A user may not change their own role (returns `422`).

**Request body**
```json
{ "userId": "clx...", "role": "ADMIN" }
```
`role` must be `"USER"` or `"ADMIN"`.

**Response `200`**
```json
{ "user": { "id": "clx...", "role": "ADMIN" } }
```

**curl**
```bash
curl -b cookie.jar -H 'Content-Type: application/json' \
  -d '{"userId":"clx...","role":"ADMIN"}' http://localhost:3000/api/admin/users
```

---

### 8.4 Delete a user

| | |
| --- | --- |
| Method | `DELETE` |
| Path | `/api/admin/users/{id}` |
| Auth | admin |

Validation:
- Cannot delete your own account (`422`)
- Cannot delete another admin account (`422`)

Cascades to the user's `AudioFile`, `Session`, and (transitively) all session analyses. `LoginHistory` rows are retained with `userId = NULL`.

**Response `200`**
```json
{ "ok": true }
```

**curl**
```bash
curl -b cookie.jar -X DELETE http://localhost:3000/api/admin/users/clx...
```

---

## 9. Root health check

| | |
| --- | --- |
| Method | `GET` |
| Path | `/api` |
| Auth | none |

**Response `200`**
```json
{ "message": "Hello, world!" }
```

**curl**
```bash
curl http://localhost:3000/api
```

---

## Status code summary

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created (register, audio upload, session create) |
| `400` | Bad request (e.g. invalid reset token, unsupported export format) |
| `401` | Unauthenticated |
| `403` | Forbidden (non-admin hitting an admin route) |
| `404` | Resource not found / not owned by the caller |
| `409` | Conflict (duplicate email on register) |
| `422` | Validation error (bad input) |
| `500` | Internal server error (AI failure, disk error) |
