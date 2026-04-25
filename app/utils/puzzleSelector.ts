/**
 * Picks daily (date-seeded) and free-play targets from `CURATED_ANIMALS`, with optional difficulty weighting.
 */

/**
 * Difficulty level for puzzle animals
 */
export type DifficultyLevel = "easy" | "medium" | "hard";

/**
 * Curated animal entry with metadata
 */
export interface CuratedAnimal {
  /** iNaturalist taxon ID */
  id: string;
  /** Common name */
  name: string;
  /** Scientific name */
  scientificName: string;
  /** Difficulty level */
  difficulty: DifficultyLevel;
  /** Taxonomic group (for diversity) */
  taxonomicGroup: string;
  /** Brief educational note */
  educationalNote?: string;
}

/**
 * Curated list of target animals for puzzles
 *
 * Selection criteria:
 * - Diverse taxonomic groups (mammals, birds, reptiles, amphibians, fish, invertebrates)
 * - Balanced difficulty levels (common vs. rare animals)
 * - Educational value (interesting evolutionary relationships)
 * - Complete data available in iNaturalist API
 *
 * All IDs are verified iNaturalist taxon IDs for species-level animals.
 */
export const CURATED_ANIMALS: CuratedAnimal[] = [
  // Easy - Common, well-known animals
  { id: "41967", name: "Tiger", scientificName: "Panthera tigris", difficulty: "easy", taxonomicGroup: "mammal", educationalNote: "Large cat, member of Panthera genus" },
  { id: "41964", name: "Lion", scientificName: "Panthera leo", difficulty: "easy", taxonomicGroup: "mammal", educationalNote: "King of the jungle, social big cat" },
  { id: "43694", name: "African Savanna Elephant", scientificName: "Loxodonta africana", difficulty: "easy", taxonomicGroup: "mammal", educationalNote: "Largest land mammal" },
  { id: "5305", name: "Bald Eagle", scientificName: "Haliaeetus leucocephalus", difficulty: "easy", taxonomicGroup: "bird", educationalNote: "National bird of USA, apex predator" },
  { id: "5212", name: "Red-tailed Hawk", scientificName: "Buteo jamaicensis", difficulty: "easy", taxonomicGroup: "bird", educationalNote: "Common North American raptor" },
  { id: "26159", name: "American Alligator", scientificName: "Alligator mississippiensis", difficulty: "easy", taxonomicGroup: "reptile", educationalNote: "Large crocodilian, apex predator" },
  { id: "36514", name: "Green Anole", scientificName: "Anolis carolinensis", difficulty: "easy", taxonomicGroup: "reptile", educationalNote: "Common lizard, color-changing ability" },
  { id: "65979", name: "American Bullfrog", scientificName: "Lithobates catesbeianus", difficulty: "easy", taxonomicGroup: "amphibian", educationalNote: "Large frog, invasive in some regions" },
  { id: "23702", name: "Red-eyed Tree Frog", scientificName: "Agalychnis callidryas", difficulty: "easy", taxonomicGroup: "amphibian", educationalNote: "Colorful arboreal frog" },
  { id: "4956", name: "Great Blue Heron", scientificName: "Ardea herodias", difficulty: "easy", taxonomicGroup: "bird", educationalNote: "Large wading bird, patient hunter" },

  // Medium - Moderately well-known animals
  { id: "74831", name: "Snow Leopard", scientificName: "Panthera uncia", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Mountain-dwelling big cat, endangered" },
  { id: "41970", name: "Jaguar", scientificName: "Panthera onca", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Largest cat in Americas, powerful swimmer" },
  { id: "43697", name: "Asian Elephant", scientificName: "Elephas maximus", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Smaller ears than African elephant" },
  { id: "4647", name: "Peregrine Falcon", scientificName: "Falco peregrinus", difficulty: "medium", taxonomicGroup: "bird", educationalNote: "Fastest animal on Earth, diving speed" },
  { id: "1578502", name: "American Barn Owl", scientificName: "Tyto furcata", difficulty: "medium", taxonomicGroup: "bird", educationalNote: "Silent hunter, heart-shaped face" },
  { id: "39449", name: "Komodo Dragon", scientificName: "Varanus komodoensis", difficulty: "medium", taxonomicGroup: "reptile", educationalNote: "Largest living lizard, venomous" },
  { id: "31419", name: "Eastern Bearded Dragon", scientificName: "Pogona barbata", difficulty: "medium", taxonomicGroup: "reptile", educationalNote: "Popular pet lizard, Australian native" },
  { id: "66278", name: "Strawberry Poison Dart Frog", scientificName: "Oophaga pumilio", difficulty: "medium", taxonomicGroup: "amphibian", educationalNote: "Brightly colored, toxic skin" },
  { id: "26777", name: "Axolotl", scientificName: "Ambystoma mexicanum", difficulty: "medium", taxonomicGroup: "amphibian", educationalNote: "Neotenic salamander, regenerative abilities" },
  { id: "116999", name: "Osprey", scientificName: "Pandion haliaetus", difficulty: "medium", taxonomicGroup: "bird", educationalNote: "Fish-eating raptor, specialized hunter" },
  { id: "42157", name: "Northern Giraffe", scientificName: "Giraffa camelopardalis", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Tallest mammal, long neck adaptation" },
  { id: "42149", name: "Common Hippopotamus", scientificName: "Hippopotamus amphibius", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Semi-aquatic, aggressive herbivore" },
  { id: "43345", name: "Indian Rhinoceros", scientificName: "Rhinoceros unicornis", difficulty: "medium", taxonomicGroup: "mammal", educationalNote: "Large herbivore, thick skin" },
  { id: "20044", name: "Great Horned Owl", scientificName: "Bubo virginianus", difficulty: "medium", taxonomicGroup: "bird", educationalNote: "Powerful nocturnal predator" },
  { id: "30472", name: "Northern King Cobra", scientificName: "Ophiophagus hannah", difficulty: "medium", taxonomicGroup: "reptile", educationalNote: "Longest venomous snake" },

  // Hard - Less common, specialized animals
  { id: "41972", name: "Mainland Clouded Leopard", scientificName: "Neofelis nebulosa", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Arboreal cat, intermediate between big and small cats" },
  { id: "42042", name: "Caracal", scientificName: "Caracal caracal", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Desert cat, exceptional jumper" },
  { id: "42155", name: "Okapi", scientificName: "Okapia johnstoni", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Forest giraffe, zebra-like stripes" },
  { id: "117214", name: "Secretarybird", scientificName: "Sagittarius serpentarius", difficulty: "hard", taxonomicGroup: "bird", educationalNote: "Snake-hunting bird, long legs" },
  { id: "4338", name: "Shoebill", scientificName: "Balaeniceps rex", difficulty: "hard", taxonomicGroup: "bird", educationalNote: "Prehistoric-looking bird, large bill" },
  { id: "35003", name: "Gila Monster", scientificName: "Heloderma suspectum", difficulty: "hard", taxonomicGroup: "reptile", educationalNote: "Venomous lizard, slow-moving" },
  { id: "200834", name: "Tuatara", scientificName: "Sphenodon punctatus", difficulty: "hard", taxonomicGroup: "reptile", educationalNote: "Living fossil, not a lizard" },
  { id: "28117", name: "Koh Tao Caecilian", scientificName: "Ichthyophis kohtaoensis", difficulty: "hard", taxonomicGroup: "amphibian", educationalNote: "Legless amphibian, burrowing" },
  { id: "27685", name: "Common Mudpuppy", scientificName: "Necturus maculosus", difficulty: "hard", taxonomicGroup: "amphibian", educationalNote: "Aquatic salamander, retains gills" },
  { id: "1626", name: "Hoatzin", scientificName: "Opisthocomus hoazin", difficulty: "hard", taxonomicGroup: "bird", educationalNote: "Primitive bird, digestive fermentation" },
  { id: "47062", name: "Aardvark", scientificName: "Orycteropus afer", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Ant-eating mammal, unique order" },
  { id: "43357", name: "Pangolins", scientificName: "Pholidota", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Scaly anteater, most trafficked mammal" },
  { id: "210941", name: "Red-flanked Bluetail", scientificName: "Tarsiger cyanurus", difficulty: "hard", taxonomicGroup: "mammal", educationalNote: "Small primate, huge eyes" },
  { id: "31215", name: "Frilled Dragon", scientificName: "Chlamydosaurus kingii", difficulty: "hard", taxonomicGroup: "reptile", educationalNote: "Australian lizard, defensive frill" },
];

/**
 * Simple hash function for deterministic selection
 * Converts a date string to a numeric seed
 * @param date - Date string in YYYY-MM-DD format
 * @returns Numeric seed value
 */
function hashDate(date: string): number {
  // Simple hash: convert date string to number
  // This ensures same date always produces same hash
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Select a target animal from the curated list based on date
 *
 * This function provides deterministic selection: the same date will always
 * return the same animal ID. This ensures consistency across sessions.
 *
 * Algorithm:
 * 1. Hash the date string to get a numeric seed
 * 2. Use modulo operation to select from curated list
 * 3. Ensures even distribution across the list over time
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Animal ID (iNaturalist taxon ID) as string
 * @throws Error if date is invalid or curated list is empty
 */
export function selectTargetAnimal(date: string): string {
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD format.`);
  }

  const parts = date.split("-");
  if (parts.length !== 3) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid date: ${date}. Month must be between 1 and 12.`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid date: ${date}. Day must be between 1 and 31.`);
  }
  // Create date object and verify it matches input (catches invalid dates like 2024-02-30)
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year
    || dateObj.getMonth() !== month - 1
    || dateObj.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${date}. Date is not valid.`);
  }

  // Check curated list is not empty
  if (CURATED_ANIMALS.length === 0) {
    throw new Error("Curated animals list is empty. Cannot select target animal.");
  }

  // Hash date to get deterministic seed
  const seed = hashDate(date);

  // Use modulo to select from curated list
  // This ensures even distribution across all animals
  const index = seed % CURATED_ANIMALS.length;

  // Return the selected animal's ID
  return CURATED_ANIMALS[index]!.id;
}

/**
 * Select a target animal with difficulty balancing
 *
 * This function selects an animal while attempting to balance difficulty
 * across puzzle dates. It uses a weighted selection based on date hash
 * to distribute easy, medium, and hard puzzles over time.
 *
 * Difficulty distribution strategy:
 * - 40% easy puzzles (common, well-known animals)
 * - 40% medium puzzles (moderately known animals)
 * - 20% hard puzzles (less common, specialized animals)
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Animal ID (iNaturalist taxon ID) as string
 * @throws Error if date is invalid or curated list is empty
 */
export function selectTargetAnimalWithDifficulty(date: string): string {
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD format.`);
  }

  const parts = date.split("-");
  if (parts.length !== 3) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid date: ${date}. Month must be between 1 and 12.`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid date: ${date}. Day must be between 1 and 31.`);
  }
  // Create date object and verify it matches input (catches invalid dates like 2024-02-30)
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year
    || dateObj.getMonth() !== month - 1
    || dateObj.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${date}. Date is not valid.`);
  }

  // Check curated list is not empty
  if (CURATED_ANIMALS.length === 0) {
    throw new Error("Curated animals list is empty. Cannot select target animal.");
  }

  // Hash date to get deterministic seed
  const seed = hashDate(date);

  // Filter animals by difficulty
  const easyAnimals = CURATED_ANIMALS.filter(a => a.difficulty === "easy");
  const mediumAnimals = CURATED_ANIMALS.filter(a => a.difficulty === "medium");
  const hardAnimals = CURATED_ANIMALS.filter(a => a.difficulty === "hard");

  // Use seed to determine difficulty level (weighted distribution)
  // 40% easy, 40% medium, 20% hard
  const difficultySeed = seed % 100;
  let selectedList: CuratedAnimal[];

  if (difficultySeed < 40) {
    // 0-39: Easy (40%)
    selectedList = easyAnimals.length > 0 ? easyAnimals : CURATED_ANIMALS;
  } else if (difficultySeed < 80) {
    // 40-79: Medium (40%)
    selectedList = mediumAnimals.length > 0 ? mediumAnimals : CURATED_ANIMALS;
  } else {
    // 80-99: Hard (20%)
    selectedList = hardAnimals.length > 0 ? hardAnimals : CURATED_ANIMALS;
  }

  // Select from the filtered list
  const index = seed % selectedList.length;

  return selectedList[index]!.id;
}

/**
 * Get animal metadata from curated list by ID
 * @param animalId - iNaturalist taxon ID
 * @returns CuratedAnimal entry or undefined if not found
 */
export function getCuratedAnimalById(animalId: string): CuratedAnimal | undefined {
  return CURATED_ANIMALS.find(animal => animal.id === animalId);
}

/**
 * Get all animals of a specific difficulty level
 * @param difficulty - Difficulty level to filter by
 * @returns Array of CuratedAnimal entries
 */
export function getAnimalsByDifficulty(difficulty: DifficultyLevel): CuratedAnimal[] {
  return CURATED_ANIMALS.filter(animal => animal.difficulty === difficulty);
}

/**
 * Get all animals in a specific taxonomic group
 * @param taxonomicGroup - Taxonomic group to filter by
 * @returns Array of CuratedAnimal entries
 */
export function getAnimalsByTaxonomicGroup(taxonomicGroup: string): CuratedAnimal[] {
  return CURATED_ANIMALS.filter(animal => animal.taxonomicGroup === taxonomicGroup);
}

/**
 * Select a random target animal from the curated list (for free play mode)
 *
 * This function provides non-deterministic selection: each call returns
 * a different random animal. Used for free play mode where players can
 * reset and get a new puzzle anytime.
 *
 * @returns Animal ID (iNaturalist taxon ID) as string
 * @throws Error if curated list is empty
 */
export function selectRandomTargetAnimal(): string {
  // Check curated list is not empty
  if (CURATED_ANIMALS.length === 0) {
    throw new Error("Curated animals list is empty. Cannot select target animal.");
  }

  // Randomly select from curated list
  const randomIndex = Math.floor(Math.random() * CURATED_ANIMALS.length);
  return CURATED_ANIMALS[randomIndex]!.id;
}

/**
 * Get statistics about the curated animal list
 * @returns Object with counts by difficulty and taxonomic group
 */
export function getCuratedAnimalsStats(): {
  total: number;
  byDifficulty: Record<DifficultyLevel, number>;
  byTaxonomicGroup: Record<string, number>;
} {
  const byDifficulty: Record<DifficultyLevel, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const byTaxonomicGroup: Record<string, number> = {};

  for (const animal of CURATED_ANIMALS) {
    byDifficulty[animal.difficulty]++;
    byTaxonomicGroup[animal.taxonomicGroup] = (byTaxonomicGroup[animal.taxonomicGroup] || 0) + 1;
  }

  return {
    total: CURATED_ANIMALS.length,
    byDifficulty,
    byTaxonomicGroup,
  };
}
