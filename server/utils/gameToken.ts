/**
 * Encrypted game tokens so the client cannot read targetId (AES-256-GCM).
 */

import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import process from "node:process";
import { HINT_GUESS_COST } from "~/types/hint";
import { getCurrentDateUTC } from "../../shared/puzzleDateCore";

export type GameApiMode = "daily" | "free-play" | "baby";

/** Absolute max lifetime from issuedAt (all modes). */
export const GAME_TOKEN_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** Allow small clock skew when comparing issuedAt to server now. */
const ISSUED_AT_FUTURE_SKEW_MS = 60 * 1000;

export interface GameTokenPayload {
  mode: GameApiMode;
  targetId: string;
  puzzleDate: string;
  maxGuesses: number;
  issuedAt: number;
  /** Ordered animal ids already guessed in this sealed session. */
  guessAnimalIds: string[];
  /** Ordered clade names revealed by paid hints in this sealed session. */
  hintClades: string[];
}

export interface CreateGameTokenPayloadParams {
  mode: GameApiMode;
  targetId: string;
  puzzleDate: string;
  maxGuesses: number;
  issuedAt?: number;
  guessAnimalIds?: string[];
  hintClades?: string[];
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Resolve NUXT_PUZZLE_SECRET from runtime config / env.
 * @returns Non-empty secret string
 */
export function getPuzzleSecret(): string {
  try {
    const config = useRuntimeConfig();
    const secret = String(config.puzzleSecret || "").trim();
    if (secret.length >= 16) {
      return secret;
    }
  } catch {
    // Outside Nitro (unit tests)
  }
  if (import.meta.dev) {
    return "cladle-dev-puzzle-secret";
  }
  const envSecret = String(process.env.NUXT_PUZZLE_SECRET || "").trim();
  if (envSecret.length >= 16) {
    return envSecret;
  }
  throw new Error("NUXT_PUZZLE_SECRET is not configured");
}

/**
 * Build a fresh or continued sealed-session payload.
 * @param params - Core identity fields plus optional progress
 * @returns Normalized token payload
 */
export function createGameTokenPayload(
  params: CreateGameTokenPayloadParams,
): GameTokenPayload {
  return {
    mode: params.mode,
    targetId: params.targetId,
    puzzleDate: params.puzzleDate,
    maxGuesses: params.maxGuesses,
    issuedAt: params.issuedAt ?? Date.now(),
    guessAnimalIds: [...(params.guessAnimalIds ?? [])],
    hintClades: [...(params.hintClades ?? [])],
  };
}

/**
 * Authoritative guess budget already spent (animal guesses + hint costs).
 * @param payload - Sealed token payload
 * @returns Units spent so far
 */
export function getSpentGuessUnits(payload: GameTokenPayload): number {
  return payload.guessAnimalIds.length + payload.hintClades.length * HINT_GUESS_COST;
}

/**
 * Reject tokens that are too old, from the future, or for a past daily/baby puzzle date.
 * @param payload - Decrypted token payload
 * @param now - Current time (ms)
 * @throws Error when the token is no longer usable
 */
export function assertGameTokenNotExpired(
  payload: GameTokenPayload,
  now: number = Date.now(),
): void {
  if (payload.issuedAt > now + ISSUED_AT_FUTURE_SKEW_MS) {
    throw new Error("Game token expired");
  }
  if (now - payload.issuedAt > GAME_TOKEN_MAX_AGE_MS) {
    throw new Error("Game token expired");
  }
  if (
    (payload.mode === "daily" || payload.mode === "baby")
    && payload.puzzleDate !== getCurrentDateUTC()
  ) {
    throw new Error("Game token expired");
  }
}

/**
 * Encrypt and authenticate a game token payload.
 * @param payload - Token fields including sealed targetId and progress
 * @param secret - Server-only secret
 * @returns base64url encoded token
 */
export function sealGameToken(payload: GameTokenPayload, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

/**
 * Decrypt and validate a game token.
 * @param token - base64url encoded token
 * @param secret - Server-only secret
 * @param now - Current time (ms)
 * @returns Parsed payload
 */
export function openGameToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): GameTokenPayload {
  let buf: Buffer;
  try {
    buf = Buffer.from(token, "base64url");
  } catch {
    throw new Error("Invalid game token");
  }
  if (buf.length < 12 + 16 + 1) {
    throw new Error("Invalid game token");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const key = deriveKey(secret);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as Partial<GameTokenPayload>;
    if (
      !parsed
      || (parsed.mode !== "daily" && parsed.mode !== "free-play" && parsed.mode !== "baby")
      || typeof parsed.targetId !== "string"
      || parsed.targetId.length === 0
      || typeof parsed.puzzleDate !== "string"
      || typeof parsed.maxGuesses !== "number"
      || !Number.isFinite(parsed.maxGuesses)
      || parsed.maxGuesses < 1
      || typeof parsed.issuedAt !== "number"
      || !Number.isFinite(parsed.issuedAt)
      || !isStringArray(parsed.guessAnimalIds)
      || !isStringArray(parsed.hintClades)
    ) {
      throw new Error("shape");
    }
    const payload: GameTokenPayload = {
      mode: parsed.mode,
      targetId: parsed.targetId,
      puzzleDate: parsed.puzzleDate,
      maxGuesses: parsed.maxGuesses,
      issuedAt: parsed.issuedAt,
      guessAnimalIds: parsed.guessAnimalIds,
      hintClades: parsed.hintClades,
    };
    assertGameTokenNotExpired(payload, now);
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === "Game token expired") {
      throw error;
    }
    throw new Error("Invalid game token");
  }
}
