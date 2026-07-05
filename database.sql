-- ============================================================================
-- Voice-Based Connect — SQLite DDL (equivalent to prisma/schema.prisma)
-- ----------------------------------------------------------------------------
-- This file recreates the ten relational tables used by the application:
--   User, LoginHistory, AudioFile, Session, Transcript, EmotionResult,
--   SpeakerVerification, QualityAnalysis, EvaluationScore, Report.
--
-- Notes:
--   * Targeted at SQLite (the default Prisma provider in this project).
--   * Prisma generates cuid() primary keys in code; under raw SQL use any
--     TEXT-compatible unique generator (cuid/uuid) when inserting rows.
--   * DateTime values are stored as TEXT in ISO-8601 / Julian REAL per SQLite
--     convention. Prisma maps DateTime <-> TEXT transparently.
--   * Run with:  sqlite3 db/custom.db < database.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id"               TEXT      NOT NULL PRIMARY KEY,
  "email"            TEXT      NOT NULL UNIQUE,
  "name"             TEXT      NOT NULL,
  "passwordHash"     TEXT      NOT NULL,
  "role"             TEXT      NOT NULL DEFAULT 'USER',  -- 'USER' | 'ADMIN'
  "resetToken"       TEXT,
  "resetTokenExpiry" DATETIME,
  "createdAt"        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        DATETIME  NOT NULL
);

-- ----------------------------------------------------------------------------
-- LoginHistory — audit trail of authentication attempts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "LoginHistory" (
  "id"        TEXT      NOT NULL PRIMARY KEY,
  "userId"    TEXT      REFERENCES "User"("id") ON DELETE SET NULL,
  "email"     TEXT      NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success"   BOOLEAN   NOT NULL DEFAULT 0,
  "createdAt" DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LoginHistory_userId_idx" ON "LoginHistory"("userId");

-- ----------------------------------------------------------------------------
-- AudioFile — uploaded/recorded audio artifacts (path is on disk)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AudioFile" (
  "id"           TEXT      NOT NULL PRIMARY KEY,
  "userId"       TEXT      NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "filename"     TEXT      NOT NULL,    -- stored filename on disk
  "originalName" TEXT      NOT NULL,
  "mimeType"     TEXT      NOT NULL,
  "size"         INTEGER   NOT NULL,    -- bytes
  "durationSec"  REAL      NOT NULL DEFAULT 0,
  "storagePath"  TEXT      NOT NULL,
  "createdAt"    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AudioFile_userId_idx" ON "AudioFile"("userId");

-- ----------------------------------------------------------------------------
-- Session — one analysis session per audio file
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Session" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "userId"      TEXT      NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "audioFileId" TEXT      REFERENCES "AudioFile"("id") ON DELETE SET NULL,
  "title"       TEXT      NOT NULL DEFAULT 'Voice Session',
  "durationSec" REAL      NOT NULL DEFAULT 0,
  "language"    TEXT      NOT NULL DEFAULT 'en',
  "createdAt"   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   DATETIME  NOT NULL
);
CREATE INDEX IF NOT EXISTS "Session_userId_idx"   ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_createdAt_idx" ON "Session"("createdAt");

-- ----------------------------------------------------------------------------
-- Transcript — 1:1 with Session (ASR output)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Transcript" (
  "id"        TEXT      NOT NULL PRIMARY KEY,
  "sessionId" TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "text"      TEXT      NOT NULL,
  "language"  TEXT      NOT NULL DEFAULT 'en',
  "wordCount" INTEGER   NOT NULL DEFAULT 0,
  "charCount" INTEGER   NOT NULL DEFAULT 0,
  "createdAt" DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- EmotionResult — 1:1 with Session (LLM emotion classification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EmotionResult" (
  "id"         TEXT      NOT NULL PRIMARY KEY,
  "sessionId"  TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "emotion"    TEXT      NOT NULL,    -- happy | sad | angry | neutral | fear | surprise
  "confidence" REAL      NOT NULL,    -- 0-100
  "scores"     TEXT      NOT NULL,    -- JSON string of all emotion probabilities
  "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- SpeakerVerification — 1:1 with Session
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SpeakerVerification" (
  "id"           TEXT      NOT NULL PRIMARY KEY,
  "sessionId"    TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "matchPercent" REAL      NOT NULL,    -- 0-100
  "verified"     BOOLEAN   NOT NULL DEFAULT 0,
  "confidence"   REAL      NOT NULL,    -- 0-100
  "notes"        TEXT,
  "createdAt"    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- QualityAnalysis — 1:1 with Session (audio + speech quality metrics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "QualityAnalysis" (
  "id"                 TEXT      NOT NULL PRIMARY KEY,
  "sessionId"          TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "backgroundNoise"    REAL      NOT NULL,    -- 0-100 (lower = cleaner)
  "pitch"              REAL      NOT NULL,    -- Hz estimate
  "volume"             REAL      NOT NULL,    -- 0-100 normalized loudness
  "speakingSpeed"      REAL      NOT NULL,    -- words per minute
  "clarity"            REAL      NOT NULL,    -- 0-100
  "pronunciationScore" REAL      NOT NULL,    -- 0-100
  "pauses"             INTEGER   NOT NULL,    -- count
  "pauseDurationSec"   REAL      NOT NULL DEFAULT 0,
  "fluencyScore"       REAL      NOT NULL,    -- 0-100
  "confidenceScore"    REAL      NOT NULL,    -- 0-100
  "grammarScore"       REAL      NOT NULL,    -- 0-100
  "vocabularyScore"    REAL      NOT NULL,    -- 0-100
  "details"            TEXT,                   -- JSON of extra metrics
  "createdAt"          DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- EvaluationScore — 1:1 with Session (AI evaluation scores)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EvaluationScore" (
  "id"               TEXT      NOT NULL PRIMARY KEY,
  "sessionId"        TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "pronunciation"    REAL      NOT NULL,    -- 0-100
  "grammar"          REAL      NOT NULL,    -- 0-100
  "communication"    REAL      NOT NULL,    -- 0-100
  "confidence"       REAL      NOT NULL,    -- 0-100
  "vocabulary"       REAL      NOT NULL,    -- 0-100
  "fluency"          REAL      NOT NULL,    -- 0-100
  "overallInterview" REAL      NOT NULL,    -- 0-100
  "overallSpeaking"  REAL      NOT NULL,    -- 0-100
  "rating"           TEXT      NOT NULL,    -- Excellent | Good | Average | Needs Improvement
  "createdAt"        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Report — 1:1 with Session (LLM feedback JSON + summary)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Report" (
  "id"         TEXT      NOT NULL PRIMARY KEY,
  "sessionId"  TEXT      NOT NULL UNIQUE REFERENCES "Session"("id") ON DELETE CASCADE,
  "feedback"   TEXT      NOT NULL,    -- JSON: strengths, weaknesses, tips, etc.
  "summary"    TEXT      NOT NULL,
  "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
