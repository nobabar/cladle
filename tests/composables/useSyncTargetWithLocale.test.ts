import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Animal } from "~/types/animal";
import { useGameStore } from "~/stores/gameStore";
import { useSyncTargetWithLocale } from "~/composables/useSyncTargetWithLocale";

const fetchAnimalData = vi.fn();

vi.mock("~/composables/useBiologicalAPI", () => ({
  useBiologicalAPI: () => ({
    fetchAnimalData,
  }),
}));

function createMockAnimal(name: string, id = "1"): Animal {
  return {
    id,
    name,
    scientificName: "Panthera tigris",
    lineage: [
      { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
      { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
      { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
    ],
  };
}

describe("useSyncTargetWithLocale", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchAnimalData.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refetches target on mount when locale is active", async () => {
    const { locale } = useI18n();
    locale.value = "fr";

    const store = useGameStore();
    const english = createMockAnimal("Tiger");
    const french = { ...english, name: "Tigre", description: "<p>Grand felin.</p>" };
    store.setTargetAnimal(english);

    fetchAnimalData.mockResolvedValue({ data: french, error: null });

    const Harness = defineComponent({
      setup() {
        useSyncTargetWithLocale();
        return () => null;
      },
    });

    mount(Harness);
    await nextTick();
    await vi.waitFor(() => {
      expect(fetchAnimalData).toHaveBeenCalledWith("1");
    });
    await nextTick();

    expect(store.target?.name).toBe("Tigre");
    expect(store.target?.description).toContain("felin");
  });
});
