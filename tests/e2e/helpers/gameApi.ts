import type { Page } from "@playwright/test";
import { getTodayUtcDate } from "./inaturalist";

const RANK_LEVEL_BY_INDEX = [70, 60, 50, 40, 30, 20, 10];
const RANK_BY_INDEX = ["kingdom", "phylum", "class", "order", "family", "genus", "species"];

const TAXONOMY = {
  tiger: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  lion: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera leo"],
  wolf: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae", "Canis", "Canis lupus"],
  dog: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae", "Canis", "Canis familiaris"],
} as const;

interface FixtureAnimal {
  id: string;
  name: string;
  scientificName: string;
  taxonomy: readonly string[];
}

const ANIMALS: Record<string, FixtureAnimal> = {
  41967: {
    id: "41967",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: TAXONOMY.tiger,
  },
  41964: {
    id: "41964",
    name: "Lion",
    scientificName: "Panthera leo",
    taxonomy: TAXONOMY.lion,
  },
  42051: {
    id: "42051",
    name: "Gray Wolf",
    scientificName: "Canis lupus",
    taxonomy: TAXONOMY.wolf,
  },
  47144: {
    id: "47144",
    name: "Dog",
    scientificName: "Canis familiaris",
    taxonomy: TAXONOMY.dog,
  },
};

const DEFAULT_DAILY_TARGET = "41967";
const DEFAULT_BABY_TARGET = "47144";
const STANDARD_MAX_GUESSES = 20;
const BABY_MAX_GUESSES = 20;
const HINT_COST = 4;

type GameMode = "daily" | "free-play" | "baby";

interface TokenParts {
  mode: GameMode;
  targetId: string;
  maxGuesses: number;
  spentGuessUnits: number;
  guessAnimalIds: string[];
  hintClades: string[];
}

/**
 * E2E token encoding mode/target/maxGuesses/progress.
 * @param mode - Game mode
 * @param targetId - iNaturalist taxon id
 * @param maxGuesses - Maximum number of guesses
 * @param spentGuessUnits - Units already spent
 * @param guessAnimalIds - Prior guess animal ids
 * @param hintClades - Prior hint clade names
 * @returns E2E token
 */
export function buildE2EGameToken(
  mode: GameMode,
  targetId: string,
  maxGuesses: number = STANDARD_MAX_GUESSES,
  spentGuessUnits: number = 0,
  guessAnimalIds: string[] = [],
  hintClades: string[] = [],
): string {
  return [
    "e2e",
    mode,
    targetId,
    String(maxGuesses),
    String(spentGuessUnits),
    guessAnimalIds.join(","),
    hintClades.join(","),
  ].join(":");
}

function parseToken(token: string): TokenParts {
  const match = /^e2e:(daily|free-play|baby):([^:]+):(\d+):(\d+):([^:]*):([^:]*)$/.exec(token);
  if (!match) {
    return {
      mode: "daily",
      targetId: DEFAULT_DAILY_TARGET,
      maxGuesses: STANDARD_MAX_GUESSES,
      spentGuessUnits: 0,
      guessAnimalIds: [],
      hintClades: [],
    };
  }
  return {
    mode: match[1] as GameMode,
    targetId: match[2]!,
    maxGuesses: Number(match[3]),
    spentGuessUnits: Number(match[4]),
    guessAnimalIds: match[5] ? match[5].split(",").filter(Boolean) : [],
    hintClades: match[6] ? match[6].split(",").filter(Boolean) : [],
  };
}

function toAnimal(fixture: FixtureAnimal) {
  return {
    id: fixture.id,
    name: fixture.name,
    scientificName: fixture.scientificName,
    lineage: fixture.taxonomy.map((name, index) => ({
      id: `taxon-${index}`,
      name,
      rank: RANK_BY_INDEX[index] ?? "class",
      rankLevel: RANK_LEVEL_BY_INDEX[index] ?? 50,
    })),
    imageUrl: "https://example.com/fake-photo.jpg",
    description: `${fixture.name} is a fixture animal used in Cladle end-to-end tests.`,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${fixture.name.replace(/\s+/g, "_")}`,
    url: `https://www.inaturalist.org/taxa/${fixture.id}`,
  };
}

function calculateFixtureLCA(guessId: string, targetId: string) {
  const guess = ANIMALS[guessId] ?? ANIMALS[DEFAULT_DAILY_TARGET]!;
  const target = ANIMALS[targetId] ?? ANIMALS[DEFAULT_DAILY_TARGET]!;
  let depth = 0;
  const max = Math.min(guess.taxonomy.length, target.taxonomy.length);
  while (depth < max && guess.taxonomy[depth] === target.taxonomy[depth]) {
    depth += 1;
  }
  const lcaDepth = depth - 1;
  if (lcaDepth < 0) {
    return { clade: "Life", rank: "root", depth: -1, path: [] as string[] };
  }
  return {
    clade: target.taxonomy[lcaDepth]!,
    rank: RANK_BY_INDEX[lcaDepth] ?? "class",
    depth: lcaDepth,
    path: target.taxonomy.slice(0, lcaDepth + 1),
  };
}

function isGameApiUrl(url: URL, suffix: string): boolean {
  return url.pathname === `/api/game/${suffix}` || url.pathname.endsWith(`/api/game/${suffix}`);
}

/**
 * Mock Nitro `/api/game/*` so Playwright does not depend on server-side iNaturalist
 * or real sealed tokens. Daily/free-play mystery is always Tiger; baby is Dog.
 * @param page - Playwright page
 */
export async function mockGameApi(page: Page): Promise<void> {
  await page.route("**/api/game/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "POST" && isGameApiUrl(url, "start")) {
      const body = route.request().postDataJSON() as { mode?: GameMode } | null;
      const mode = body?.mode ?? "daily";
      const puzzleDate = mode === "free-play" ? "" : getTodayUtcDate();
      const targetId = mode === "baby" ? DEFAULT_BABY_TARGET : DEFAULT_DAILY_TARGET;
      const maxGuesses = mode === "baby" ? BABY_MAX_GUESSES : STANDARD_MAX_GUESSES;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode,
          puzzleDate,
          gameToken: buildE2EGameToken(mode, targetId, maxGuesses),
          maxGuesses,
        }),
      });
      return;
    }

    if (method === "POST" && isGameApiUrl(url, "guess")) {
      const body = route.request().postDataJSON() as {
        gameToken?: string;
        animalId?: string;
      } | null;
      const token = parseToken(body?.gameToken ?? "");
      const animalId = body?.animalId ?? "";
      const correct = animalId === token.targetId;
      const nextGuessIds = [...token.guessAnimalIds, animalId];
      const guessesUsed = token.spentGuessUnits + 1;
      let status: "playing" | "won" | "lost" = "playing";
      if (correct) {
        status = "won";
      } else if (guessesUsed >= token.maxGuesses) {
        status = "lost";
      }
      const targetFixture = ANIMALS[token.targetId] ?? ANIMALS[DEFAULT_DAILY_TARGET]!;
      const response: Record<string, unknown> = {
        lca: calculateFixtureLCA(animalId, token.targetId),
        correct,
        status,
        guessesUsed,
        hasHintAvailable: status === "playing" && (token.maxGuesses - guessesUsed) > HINT_COST,
        gameToken: buildE2EGameToken(
          token.mode,
          token.targetId,
          token.maxGuesses,
          guessesUsed,
          nextGuessIds,
          token.hintClades,
        ),
      };
      if (status === "won" || status === "lost") {
        response.reveal = toAnimal(targetFixture);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
      return;
    }

    if (method === "POST" && isGameApiUrl(url, "hint")) {
      const body = route.request().postDataJSON() as {
        gameToken?: string;
      } | null;
      const token = parseToken(body?.gameToken ?? "");
      const guessesUsed = token.spentGuessUnits + HINT_COST;
      const status = guessesUsed >= token.maxGuesses ? "lost" : "playing";
      const nextHintClades = [...token.hintClades, "Mammalia"];
      const targetFixture = ANIMALS[token.targetId] ?? ANIMALS[DEFAULT_DAILY_TARGET]!;
      const response: Record<string, unknown> = {
        hint: {
          revealedClade: "Mammalia",
          rank: "class",
          depth: 2,
          path: ["Animalia", "Chordata", "Mammalia"],
          cost: HINT_COST,
        },
        status,
        guessesUsed,
        hasHintAvailable: status === "playing" && (token.maxGuesses - guessesUsed) > HINT_COST,
        gameToken: buildE2EGameToken(
          token.mode,
          token.targetId,
          token.maxGuesses,
          guessesUsed,
          token.guessAnimalIds,
          nextHintClades,
        ),
      };
      if (status === "lost") {
        response.reveal = toAnimal(targetFixture);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
      return;
    }

    await route.continue();
  });
}
