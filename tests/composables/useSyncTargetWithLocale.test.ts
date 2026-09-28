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

function mountSyncHarness(): void {
  const Harness = defineComponent({
    setup() {
      useSyncTargetWithLocale();
      return () => null;
    },
  });
  mount(Harness);
}

describe("useSyncTargetWithLocale", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchAnimalData.mockReset();
    const { locale } = useI18n();
    locale.value = "en";
  });

  afterEach(() => {
    vi.clearAllMocks();
    const { locale } = useI18n();
    locale.value = "en";
  });

  it("refetches target on mount when locale is active", async () => {
    const { locale } = useI18n();
    locale.value = "fr";

    const store = useGameStore();
    const english = createMockAnimal("Tiger");
    const french = { ...english, name: "Tigre", description: "<p>Grand felin.</p>" };
    store.setTargetAnimal(english);
    store.status = "won";

    fetchAnimalData.mockResolvedValue({ data: french, error: null });

    mountSyncHarness();
    await nextTick();
    await vi.waitFor(() => {
      expect(fetchAnimalData).toHaveBeenCalledWith("1");
    });
    await nextTick();

    expect(store.target?.name).toBe("Tigre");
    expect(store.target?.description).toContain("felin");
  });

  it("refetches when the target taxon id changes after mount", async () => {
    const store = useGameStore();
    store.status = "won";
    fetchAnimalData.mockResolvedValue({ data: null, error: null });

    mountSyncHarness();
    await nextTick();
    expect(fetchAnimalData).not.toHaveBeenCalled();

    const zebra = createMockAnimal("Zebra", "43335");
    const enriched = {
      ...zebra,
      imageUrl: "https://example.com/zebra.jpg",
      description: "<p>Striped equid.</p>",
    };
    fetchAnimalData.mockResolvedValue({ data: enriched, error: null });
    store.setTargetAnimal(zebra);
    store.status = "won";

    await vi.waitFor(() => {
      expect(fetchAnimalData).toHaveBeenCalledWith("43335");
    });
    await nextTick();

    expect(store.target?.imageUrl).toBe("https://example.com/zebra.jpg");
    expect(store.target?.description).toContain("Striped");
  });

  it("refetches baby mode English reveal instead of treating the bundle as offline", async () => {
    const store = useGameStore();
    store.gameMode = "baby";
    store.status = "won";
    store.setTargetAnimal({
      ...createMockAnimal("Zebra", "43335"),
      imageUrl: "https://example.com/zebra.jpg",
      description: "<p>Bundle English copy.</p>",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Equus%20quagga",
    });

    const enriched = {
      ...createMockAnimal("Zebra", "43335"),
      name: "Zebra",
      imageUrl: "https://example.com/zebra-inat.jpg",
      description: "<p>iNaturalist English copy.</p>",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Equus%20quagga",
    };
    fetchAnimalData.mockResolvedValue({ data: enriched, error: null });

    mountSyncHarness();
    await nextTick();
    await vi.waitFor(() => {
      expect(fetchAnimalData).toHaveBeenCalledWith("43335");
    });
    await nextTick();

    expect(store.target?.description).toContain("iNaturalist");
  });

  it("clears English baby description before fetching a non-English locale", async () => {
    const { locale } = useI18n();
    locale.value = "fr";

    const store = useGameStore();
    store.gameMode = "baby";
    store.status = "won";
    store.setTargetAnimal({
      ...createMockAnimal("Zebra", "43335"),
      imageUrl: "https://example.com/zebra.jpg",
      description: "<p>English flash.</p>",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Equus%20quagga",
    });
    store.status = "won";

    let resolveFetch: (value: { data: Animal; error: null }) => void = () => undefined;
    fetchAnimalData.mockImplementation(
      () => new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    mountSyncHarness();
    await nextTick();
    await vi.waitFor(() => {
      expect(store.target?.description).toBeUndefined();
    });

    resolveFetch({
      data: {
        ...createMockAnimal("Zebra", "43335"),
        name: "Zèbre",
        description: "<p>Copie française.</p>",
        imageUrl: "https://example.com/zebra.jpg",
        wikipediaUrl: "https://fr.wikipedia.org/wiki/Z%C3%A8bre",
      },
      error: null,
    });

    await vi.waitFor(() => {
      expect(store.target?.description).toContain("française");
    });
  });
});
