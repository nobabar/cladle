/* eslint-disable camelcase */

import { describe, expect, it } from "vitest";
import {
  buildLineageFromAncestors,
  isAtOrAboveSpecies,
  lineageNames,
  SPECIES_RANK_LEVEL,
} from "~/utils/taxonLineage";

describe("taxonLineage", () => {
  describe("isAtOrAboveSpecies", () => {
    it("includes species floor via rank_level", () => {
      expect(isAtOrAboveSpecies(10)).toBe(true);
      expect(isAtOrAboveSpecies(70)).toBe(true);
      expect(isAtOrAboveSpecies(5)).toBe(false);
    });

    it("falls back when rank_level is missing", () => {
      expect(isAtOrAboveSpecies(undefined, "species")).toBe(true);
      expect(isAtOrAboveSpecies(undefined, "subspecies")).toBe(false);
      expect(isAtOrAboveSpecies(undefined, "variety")).toBe(false);
    });
  });

  describe("buildLineageFromAncestors", () => {
    it("includes intermediate ranks with rank_level >= 10", () => {
      const ancestors = [
        { id: 1, name: "Animalia", rank: "kingdom", rank_level: 70 },
        { id: 2, name: "Chordata", rank: "phylum", rank_level: 60 },
        { id: 3, name: "Mammalia", rank: "class", rank_level: 50 },
        { id: 4, name: "Laurasiatheria", rank: "superorder", rank_level: 45 },
      ];
      const taxon = { id: 5, name: "Panthera tigris", rank: "species", rank_level: 10 };

      const lineage = buildLineageFromAncestors(ancestors, taxon);

      expect(lineageNames(lineage)).toEqual([
        "Animalia",
        "Chordata",
        "Mammalia",
        "Laurasiatheria",
        "Panthera tigris",
      ]);
      expect(lineage.find(t => t.rank === "superorder")).toBeDefined();
    });

    it("excludes subspecies via rank_level", () => {
      const ancestors = [
        { id: 1, name: "Animalia", rank: "kingdom", rank_level: 70 },
        { id: 2, name: "Panthera tigris", rank: "species", rank_level: 10 },
        { id: 3, name: "Panthera tigris altaica", rank: "subspecies", rank_level: 5 },
      ];
      const taxon = { id: 2, name: "Panthera tigris", rank: "species", rank_level: 10 };

      const lineage = buildLineageFromAncestors(ancestors, taxon);

      expect(lineage).toHaveLength(2);
      expect(lineage.every(t => (t.rankLevel ?? SPECIES_RANK_LEVEL) >= 10)).toBe(true);
    });

    it("preserves order and dedupes terminal species id", () => {
      const ancestors = [
        { id: 1, name: "Animalia", rank: "kingdom", rank_level: 70 },
        { id: 2, name: "Panthera tigris", rank: "species", rank_level: 10 },
      ];
      const taxon = { id: 2, name: "Panthera tigris", rank: "species", rank_level: 10 };

      const lineage = buildLineageFromAncestors(ancestors, taxon);

      expect(lineage.map(t => t.id)).toEqual(["1", "2"]);
    });

    it("uses rank fallback when rank_level is missing", () => {
      const ancestors = [
        { id: 1, name: "Animalia", rank: "kingdom" },
        { id: 2, name: "Panthera tigris altaica", rank: "subspecies" },
      ];
      const taxon = { id: 3, name: "Panthera tigris", rank: "species" };

      const lineage = buildLineageFromAncestors(ancestors, taxon);

      expect(lineageNames(lineage)).toEqual(["Animalia", "Panthera tigris"]);
    });

    it("starts lineage at Animalia when present", () => {
      const ancestors = [
        { id: 99, name: "Life", rank: "stateofmatter", rank_level: 100 },
        { id: 1, name: "Animalia", rank: "kingdom", rank_level: 70 },
      ];
      const taxon = { id: 2, name: "Panthera tigris", rank: "species", rank_level: 10 };

      const lineage = buildLineageFromAncestors(ancestors, taxon);

      expect(lineage[0]?.name).toBe("Animalia");
    });
  });
});
