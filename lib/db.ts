import "server-only";

import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { getAllowedEmails } from "@/lib/security";
import type { ProgressState } from "@/lib/types";

type GlobalWithDb = typeof globalThis & {
  kolospeakDbPool?: Pool;
  kolospeakDbReady?: Promise<void>;
};

type UserRow = RowDataPacket & {
  id: number;
  email: string;
};

type SettingsRow = RowDataPacket & {
  settings_json: string | null;
};

const globalForDb = globalThis as GlobalWithDb;

const requiredEnv = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;

export function databaseStatus() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing
  };
}

export function getDbPool() {
  const status = databaseStatus();
  if (!status.configured) {
    throw new Error(`Database is not configured. Missing: ${status.missing.join(", ")}`);
  }

  if (!globalForDb.kolospeakDbPool) {
    globalForDb.kolospeakDbPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }

  return globalForDb.kolospeakDbPool;
}

export async function ensureDatabase() {
  if (!globalForDb.kolospeakDbReady) {
    globalForDb.kolospeakDbReady = createTables();
  }
  return globalForDb.kolospeakDbReady;
}

async function createTables() {
  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'owner',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      baseline_score INT NULL,
      current_level VARCHAR(100) NULL,
      speaking_streak INT NOT NULL DEFAULT 0,
      reading_streak INT NOT NULL DEFAULT 0,
      weak_sounds_json LONGTEXT NULL,
      missed_words_json LONGTEXT NULL,
      dropped_endings_json LONGTEXT NULL,
      last_practiced_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY progress_user_unique (user_id),
      CONSTRAINT progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      lesson_id VARCHAR(120) NOT NULL,
      lesson_title VARCHAR(255) NOT NULL,
      score INT NOT NULL DEFAULT 0,
      feedback_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY lesson_results_user_created_idx (user_id, created_at),
      CONSTRAINT lesson_results_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      passage_id VARCHAR(160) NOT NULL,
      topic VARCHAR(160) NOT NULL,
      level VARCHAR(80) NOT NULL,
      score INT NOT NULL DEFAULT 0,
      missed_words_json LONGTEXT NULL,
      comprehension_score INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY reading_results_user_created_idx (user_id, created_at),
      CONSTRAINT reading_results_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sound_scores (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      sound_key VARCHAR(120) NOT NULL,
      score INT NOT NULL DEFAULT 0,
      attempts INT NOT NULL DEFAULT 0,
      last_practiced_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY sound_scores_user_sound_unique (user_id, sound_key),
      CONSTRAINT sound_scores_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      prompt TEXT NOT NULL,
      transcript LONGTEXT NOT NULL,
      score INT NOT NULL DEFAULT 0,
      speed_score INT NOT NULL DEFAULT 0,
      clarity_score INT NOT NULL DEFAULT 0,
      feedback_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY conversation_results_user_created_idx (user_id, created_at),
      CONSTRAINT conversation_results_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      settings_json LONGTEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY settings_user_unique (user_id),
      CONSTRAINT settings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      feature VARCHAR(120) NOT NULL,
      estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
      tokens_used INT NOT NULL DEFAULT 0,
      audio_seconds INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY ai_usage_logs_user_created_idx (user_id, created_at),
      CONSTRAINT ai_usage_logs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getOrCreateDefaultUser() {
  await ensureDatabase();
  const pool = getDbPool();
  const email = getAllowedEmails()[0] ?? "hello@leonctyes.com";
  const displayName = email.split("@")[0] || "KoloSpeak user";

  await pool.execute(
    `
      INSERT INTO users (email, display_name, role)
      VALUES (?, ?, 'owner')
      ON DUPLICATE KEY UPDATE email = VALUES(email), updated_at = CURRENT_TIMESTAMP
    `,
    [email, displayName]
  );

  const [rows] = await pool.execute<UserRow[]>("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
  const user = rows[0];
  if (!user) throw new Error("Could not load private user.");
  return user;
}

export async function loadProgressFromDb() {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();

  await pool.execute(
    `
      INSERT INTO progress (user_id)
      VALUES (?)
      ON DUPLICATE KEY UPDATE updated_at = updated_at
    `,
    [user.id]
  );

  const [rows] = await pool.execute<SettingsRow[]>(
    "SELECT settings_json FROM settings WHERE user_id = ? LIMIT 1",
    [user.id]
  );

  const stored = parseJson<{ progressState?: ProgressState }>(rows[0]?.settings_json);
  return stored?.progressState ?? null;
}

export async function saveProgressToDb(progress: ProgressState) {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();
  const lastPracticed = progress.lastPracticedDate ? `${progress.lastPracticedDate} 00:00:00` : null;
  const weakSounds = progress.baselineReport?.mainWeakSounds ?? progress.learnerProfile.recommendedNextLessons;

  await pool.execute(
    `
      INSERT INTO progress (
        user_id,
        baseline_score,
        current_level,
        speaking_streak,
        reading_streak,
        weak_sounds_json,
        missed_words_json,
        dropped_endings_json,
        last_practiced_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        baseline_score = VALUES(baseline_score),
        current_level = VALUES(current_level),
        speaking_streak = VALUES(speaking_streak),
        reading_streak = VALUES(reading_streak),
        weak_sounds_json = VALUES(weak_sounds_json),
        missed_words_json = VALUES(missed_words_json),
        dropped_endings_json = VALUES(dropped_endings_json),
        last_practiced_at = VALUES(last_practiced_at),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      user.id,
      progress.baselineReport?.overallClarityScore ?? null,
      progress.learnerProfile.focusArea,
      progress.streak,
      progress.readingStreak,
      JSON.stringify(weakSounds),
      JSON.stringify(progress.missedWords),
      JSON.stringify(progress.skippedWords),
      lastPracticed
    ]
  );

  await saveSettingsToDb({ progressState: progress });
}

export async function saveLessonResultToDb(input: {
  lessonId: string;
  lessonTitle: string;
  score: number;
  feedback: unknown;
}) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO lesson_results (user_id, lesson_id, lesson_title, score, feedback_json)
      VALUES (?, ?, ?, ?, ?)
    `,
    [user.id, input.lessonId, input.lessonTitle, input.score, JSON.stringify(input.feedback ?? {})]
  );
}

export async function saveReadingResultToDb(input: {
  passageId: string;
  topic: string;
  level: string;
  score: number;
  missedWords: string[];
  comprehensionScore: number;
}) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO reading_results (
        user_id,
        passage_id,
        topic,
        level,
        score,
        missed_words_json,
        comprehension_score
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.id,
      input.passageId,
      input.topic,
      input.level,
      input.score,
      JSON.stringify(input.missedWords ?? []),
      input.comprehensionScore
    ]
  );
}

export async function saveSoundScoreToDb(input: {
  soundKey: string;
  score: number;
  attempts?: number;
}) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO sound_scores (user_id, sound_key, score, attempts, last_practiced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        score = GREATEST(score, VALUES(score)),
        attempts = attempts + VALUES(attempts),
        last_practiced_at = CURRENT_TIMESTAMP
    `,
    [user.id, input.soundKey, input.score, input.attempts ?? 1]
  );
}

export async function saveConversationResultToDb(input: {
  prompt: string;
  transcript: string;
  score: number;
  speedScore: number;
  clarityScore: number;
  feedback: unknown;
}) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO conversation_results (
        user_id,
        prompt,
        transcript,
        score,
        speed_score,
        clarity_score,
        feedback_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.id,
      input.prompt,
      input.transcript,
      input.score,
      input.speedScore,
      input.clarityScore,
      JSON.stringify(input.feedback ?? {})
    ]
  );
}

export async function saveSettingsToDb(settings: unknown) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO settings (user_id, settings_json)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = CURRENT_TIMESTAMP
    `,
    [user.id, JSON.stringify(settings ?? {})]
  );
}

export async function loadSettingsFromDb() {
  const user = await getOrCreateDefaultUser();
  const [rows] = await getDbPool().execute<SettingsRow[]>(
    "SELECT settings_json FROM settings WHERE user_id = ? LIMIT 1",
    [user.id]
  );
  return parseJson(rows[0]?.settings_json);
}

export async function saveAiUsageLogToDb(input: {
  feature: string;
  estimatedCost?: number;
  tokensUsed?: number;
  audioSeconds?: number | null;
}) {
  const user = await getOrCreateDefaultUser();
  await getDbPool().execute(
    `
      INSERT INTO ai_usage_logs (user_id, feature, estimated_cost, tokens_used, audio_seconds)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      user.id,
      input.feature,
      input.estimatedCost ?? 0,
      input.tokensUsed ?? 0,
      input.audioSeconds ?? null
    ]
  );
}

function parseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
