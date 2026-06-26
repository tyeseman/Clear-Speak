import "server-only";

import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getAllowedEmails } from "@/lib/security";
import type { ProgressState, WordBank, WordBankItem, WordDrillAttempt } from "@/lib/types";

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

type WordBankRow = RowDataPacket & {
  id: number;
  focus_area: string;
  sound_category: string;
  batch_size: 25 | 50 | 100;
  source_reason: string;
  created_at: Date;
  completed_at: Date | null;
};

type WordBankItemRow = RowDataPacket & {
  id: number;
  word_bank_id: number;
  word: string;
  target_sound: string;
  difficulty: "easy" | "medium" | "hard";
  mouth_tip: string;
  example_sentence: string;
  common_mistake: string;
  sound_category: string;
  reason_selected: string;
  status: "new" | "in-progress" | "mastered" | "review-later";
  attempts: number;
  best_score: number;
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_banks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      focus_area VARCHAR(160) NOT NULL,
      sound_category VARCHAR(160) NOT NULL,
      batch_size INT NOT NULL DEFAULT 50,
      source_reason TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY word_banks_user_created_idx (user_id, created_at),
      CONSTRAINT word_banks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_bank_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      word_bank_id BIGINT UNSIGNED NOT NULL,
      word VARCHAR(120) NOT NULL,
      target_sound VARCHAR(160) NOT NULL,
      difficulty VARCHAR(40) NOT NULL DEFAULT 'easy',
      mouth_tip TEXT NULL,
      example_sentence TEXT NULL,
      common_mistake TEXT NULL,
      sound_category VARCHAR(160) NOT NULL,
      reason_selected TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'new',
      attempts INT NOT NULL DEFAULT 0,
      best_score INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY word_bank_items_bank_status_idx (word_bank_id, status),
      CONSTRAINT word_bank_items_bank_fk FOREIGN KEY (word_bank_id) REFERENCES word_banks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_drill_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      word_bank_item_id BIGINT UNSIGNED NULL,
      word VARCHAR(120) NOT NULL,
      target_sound VARCHAR(160) NOT NULL,
      heard_text VARCHAR(255) NULL,
      attempts INT NOT NULL DEFAULT 1,
      best_score INT NOT NULL DEFAULT 0,
      passed TINYINT(1) NOT NULL DEFAULT 0,
      review_later TINYINT(1) NOT NULL DEFAULT 0,
      feedback_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY word_drill_attempts_user_created_idx (user_id, created_at),
      CONSTRAINT word_drill_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT word_drill_attempts_item_fk FOREIGN KEY (word_bank_item_id) REFERENCES word_bank_items(id) ON DELETE SET NULL
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

export async function resetUserProgressInDb(progress: ProgressState) {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();

  await pool.execute("DELETE FROM word_drill_attempts WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM word_banks WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM ai_usage_logs WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM conversation_results WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM sound_scores WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM reading_results WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM lesson_results WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM progress WHERE user_id = ?", [user.id]);
  await pool.execute("DELETE FROM settings WHERE user_id = ?", [user.id]);

  await saveProgressToDb(progress);
}

export async function loadLatestWordBankFromDb(focusArea?: string) {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();
  const params: Array<number | string> = [user.id];
  const focusFilter = focusArea ? "AND focus_area = ?" : "";
  if (focusArea) params.push(focusArea);

  const [banks] = await pool.execute<WordBankRow[]>(
    `
      SELECT id, focus_area, sound_category, batch_size, source_reason, created_at, completed_at
      FROM word_banks
      WHERE user_id = ? ${focusFilter}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    params
  );
  const bank = banks[0];
  if (!bank) return null;

  const [items] = await pool.execute<WordBankItemRow[]>(
    `
      SELECT id, word_bank_id, word, target_sound, difficulty, mouth_tip, example_sentence,
        common_mistake, sound_category, reason_selected, status, attempts, best_score
      FROM word_bank_items
      WHERE word_bank_id = ?
      ORDER BY id ASC
    `,
    [bank.id]
  );

  return mapWordBank(bank, items);
}

export async function saveWordBankToDb(bank: WordBank) {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO word_banks (user_id, focus_area, sound_category, batch_size, source_reason)
      VALUES (?, ?, ?, ?, ?)
    `,
    [user.id, bank.focusArea, bank.soundCategory, bank.batchSize, bank.sourceReason]
  );
  const wordBankId = result.insertId;

  for (const item of bank.items) {
    await pool.execute(
      `
        INSERT INTO word_bank_items (
          word_bank_id, word, target_sound, difficulty, mouth_tip, example_sentence,
          common_mistake, sound_category, reason_selected, status, attempts, best_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        wordBankId,
        item.word,
        item.targetSound,
        item.difficulty,
        item.mouthTip,
        item.exampleSentence,
        item.commonMistake,
        item.soundCategory,
        item.reasonSelected,
        item.status,
        item.attempts,
        item.bestScore
      ]
    );
  }

  return loadLatestWordBankFromDb(bank.focusArea);
}

export async function saveWordDrillAttemptToDb(input: WordDrillAttempt & { wordBankItemId?: number }) {
  const user = await getOrCreateDefaultUser();
  const pool = getDbPool();
  await pool.execute(
    `
      INSERT INTO word_drill_attempts (
        user_id, word_bank_item_id, word, target_sound, heard_text, attempts,
        best_score, passed, review_later, feedback_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.id,
      input.wordBankItemId ?? null,
      input.word,
      input.targetSound,
      input.heardText,
      input.attempts,
      input.bestScore,
      input.passed ? 1 : 0,
      input.reviewLater ? 1 : 0,
      JSON.stringify({ feedback: input.feedback })
    ]
  );

  if (input.wordBankItemId) {
    await pool.execute(
      `
        UPDATE word_bank_items
        SET
          attempts = attempts + 1,
          best_score = GREATEST(best_score, ?),
          status = ?
        WHERE id = ?
      `,
      [
        input.bestScore,
        input.passed ? "mastered" : input.reviewLater ? "review-later" : "in-progress",
        input.wordBankItemId
      ]
    );
  }
}

function mapWordBank(bank: WordBankRow, items: WordBankItemRow[]): WordBank {
  return {
    id: bank.id,
    focusArea: bank.focus_area,
    soundCategory: bank.sound_category,
    batchSize: bank.batch_size,
    sourceReason: bank.source_reason,
    createdAt: bank.created_at?.toISOString?.() ?? String(bank.created_at),
    completedAt: bank.completed_at ? bank.completed_at.toISOString?.() ?? String(bank.completed_at) : null,
    items: items.map(mapWordBankItem)
  };
}

function mapWordBankItem(item: WordBankItemRow): WordBankItem {
  return {
    id: item.id,
    wordBankId: item.word_bank_id,
    word: item.word,
    targetSound: item.target_sound,
    difficulty: item.difficulty,
    mouthTip: item.mouth_tip,
    exampleSentence: item.example_sentence,
    commonMistake: item.common_mistake,
    soundCategory: item.sound_category,
    reasonSelected: item.reason_selected,
    status: item.status,
    attempts: item.attempts,
    bestScore: item.best_score
  };
}

function parseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
