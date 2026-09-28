import { assertPuzzleDate, hashPuzzleDate } from "../../shared/puzzleDateCore";
import { BABY_MODE_ORGANISMS } from "~/utils/babyMode";

/**
 * Deterministic Baby Mode target for a UTC puzzle date.
 * Salted with the server puzzle secret so the client catalog + public date hash
 * cannot reconstruct today's mystery.
 * @param date - UTC puzzle date (YYYY-MM-DD)
 * @param secret - Server-only puzzle secret
 * @returns Organism id
 */
export function selectBabyModeTarget(date: string, secret: string): string {
  assertPuzzleDate(date);

  if (BABY_MODE_ORGANISMS.length === 0) {
    throw new Error("Baby Mode organism list is empty. Cannot select target.");
  }

  const seed = hashPuzzleDate(`baby:${date}:${secret}`);
  const index = seed % BABY_MODE_ORGANISMS.length;
  return BABY_MODE_ORGANISMS[index]!.id;
}

/**
 * Random Baby Mode target.
 * @returns Organism id
 */
export function selectRandomBabyModeTarget(): string {
  if (BABY_MODE_ORGANISMS.length === 0) {
    throw new Error("Baby Mode organism list is empty. Cannot select target.");
  }

  const randomIndex = Math.floor(Math.random() * BABY_MODE_ORGANISMS.length);
  return BABY_MODE_ORGANISMS[randomIndex]!.id;
}
