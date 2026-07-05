# Entity-Relationship Diagram — Voice-Based Connect

This document describes the relational schema backing **Voice-Based Connect**. The schema is defined in [`prisma/schema.prisma`](../prisma/schema.prisma) and uses **SQLite** as the default provider. The diagram below is rendered from a [Mermaid](https://mermaid.js.org/) `erDiagram` block and shows all 10 tables, their fields, and the relationships between them.

## Diagram

```mermaid
erDiagram
    User ||--o{ LoginHistory : "logs"
    User ||--o{ AudioFile : "uploads"
    User ||--o{ Session : "owns"

    AudioFile ||--o{ Session : "source audio"

    Session ||--o| Transcript : "has"
    Session ||--o| EmotionResult : "has"
    Session ||--o| SpeakerVerification : "has"
    Session ||--o| QualityAnalysis : "has"
    Session ||--o| EvaluationScore : "has"
    Session ||--o| Report : "has"

    User {
        string id PK "cuid"
        string email UK
        string name
        string passwordHash
        string role "USER | ADMIN"
        string resetToken "nullable"
        datetime resetTokenExpiry "nullable"
        datetime createdAt
        datetime updatedAt
    }

    LoginHistory {
        string id PK "cuid"
        string userId FK "nullable, SET NULL on delete"
        string email
        string ipAddress "nullable"
        string userAgent "nullable"
        boolean success "default false"
        datetime createdAt
    }

    AudioFile {
        string id PK "cuid"
        string userId FK "CASCADE on delete"
        string filename "stored on disk"
        string originalName
        string mimeType
        int size "bytes"
        float durationSec "default 0"
        string storagePath
        datetime createdAt
    }

    Session {
        string id PK "cuid"
        string userId FK "CASCADE on delete"
        string audioFileId FK "nullable, SET NULL on delete"
        string title "default 'Voice Session'"
        float durationSec "default 0"
        string language "default 'en'"
        datetime createdAt
        datetime updatedAt
    }

    Transcript {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        string text
        string language "default 'en'"
        int wordCount "default 0"
        int charCount "default 0"
        datetime createdAt
    }

    EmotionResult {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        string emotion "happy|sad|angry|neutral|fear|surprise"
        float confidence "0-100"
        string scores "JSON of probabilities"
        datetime createdAt
    }

    SpeakerVerification {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        float matchPercent "0-100"
        boolean verified
        float confidence "0-100"
        string notes "nullable"
        datetime createdAt
    }

    QualityAnalysis {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        float backgroundNoise "0-100 (lower = cleaner)"
        float pitch "Hz"
        float volume "0-100"
        float speakingSpeed "wpm"
        float clarity "0-100"
        float pronunciationScore "0-100"
        int pauses "count"
        float pauseDurationSec "default 0"
        float fluencyScore "0-100"
        float confidenceScore "0-100"
        float grammarScore "0-100"
        float vocabularyScore "0-100"
        string details "nullable JSON"
        datetime createdAt
    }

    EvaluationScore {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        float pronunciation "0-100"
        float grammar "0-100"
        float communication "0-100"
        float confidence "0-100"
        float vocabulary "0-100"
        float fluency "0-100"
        float overallInterview "0-100"
        float overallSpeaking "0-100"
        string rating "Excellent|Good|Average|Needs Improvement"
        datetime createdAt
    }

    Report {
        string id PK "cuid"
        string sessionId FK_UK "CASCADE on delete, 1:1"
        string feedback "JSON: strengths, weaknesses, tips..."
        string summary
        datetime createdAt
    }
```

## Relationship Explanations

| Parent → Child | Cardinality | onDelete | Meaning |
| --- | --- | --- | --- |
| `User → LoginHistory` | one → many | `SetNull` (userId) | Each login attempt — successful or not — is recorded in `LoginHistory`. If the user is deleted the row is retained with a NULL `userId` so the audit trail survives. |
| `User → AudioFile` | one → many | `Cascade` | Audio files belong to a user; deleting the user removes all of their audio. |
| `User → Session` | one → many | `Cascade` | Sessions belong to a user; deleting the user removes all of their sessions (and analyses, transitively). |
| `AudioFile → Session` | one → many | `SetNull` (audioFileId) | A session is created from an audio file. The same audio can back multiple sessions. Deleting the audio nulls the FK so the session and its analyses survive. |
| `Session → Transcript` | one → one | `Cascade` | One transcript per session, written by the ASR step. |
| `Session → EmotionResult` | one → one | `Cascade` | One LLM emotion classification per session. |
| `Session → SpeakerVerification` | one → one | `Cascade` | One speaker-verification result per session. |
| `Session → QualityAnalysis` | one → one | `Cascade` | One audio/speech quality analysis per session. |
| `Session → EvaluationScore` | one → one | `Cascade` | One AI evaluation score set per session. |
| `Session → Report` | one → one | `Cascade` | One AI feedback report (summary + structured feedback JSON) per session. |

### Indexes

The following indexes are declared in the Prisma schema for query performance:

- `LoginHistory.userId`
- `AudioFile.userId`
- `Session.userId`
- `Session.createdAt`

All `sessionId`-based one-to-one child tables additionally have a `UNIQUE` constraint on `sessionId`, which serves as both a uniqueness guarantee and an implicit index.

### Notes on Storage Conventions

- **Primary keys** are generated as `cuid()` strings by Prisma.
- **JSON-in-TEXT columns** (`EmotionResult.scores`, `QualityAnalysis.details`, `Report.feedback`) store serialized JSON. The application parses them lazily on read.
- **Date/time** values are stored as ISO-8601 strings (SQLite TEXT) and mapped to JS `Date` by Prisma.
- **Audio binaries** are **not** stored in the database. Only metadata + `storagePath` (a disk path under `uploads/`) are persisted.
