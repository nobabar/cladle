<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import GameWinStatePhotoGallery from "~/components/game/win-state-photo-gallery.vue";
import { useUiIcons } from "~/composables/useUiIcons";
import type { Animal } from "~/types/animal";
import { sanitizeBasicHTML } from "~/utils/sanitizeBasicHTML";
import type { PhylogeneticMetrics } from "~/utils/sharingFormatter";

const props = defineProps<{
  isWon: boolean;
  babyMode?: boolean;
  statsText: string;
  targetAnimal: Animal | null;
  phyloMetrics: PhylogeneticMetrics | null;
  isShareReady: boolean;
  lastCopyStatus: "idle" | "success" | "error";
  stickerByAnimalId?: Record<string, string>;
}>();

const emit = defineEmits<{
  copy: [];
}>();

const {
  isWon,
  babyMode,
  statsText,
  targetAnimal,
  phyloMetrics,
  isShareReady,
  lastCopyStatus,
  stickerByAnimalId,
} = toRefs(props);
const { t, te } = useI18n();
const uiIcon = useUiIcons();

/** Overrides default tooltip (single-line, fixed height) for multi-line help in metrics. */
const helpTooltipUi = {
  content:
    "h-auto min-h-0 max-w-[min(240px,70vw)] whitespace-normal items-start gap-0 py-1.5 shadow-md",
  text: "block whitespace-normal text-xs leading-snug",
};

/** Absolute strategy keeps the bubble inside the modal stack (fixed would use the viewport). */
const helpTooltipContent = {
  side: "top" as const,
  sideOffset: 6,
  collisionPadding: 12,
  positionStrategy: "absolute" as const,
};

const shareButtonLabel = computed(() => {
  if (lastCopyStatus.value === "success") {
    return t("common.copied");
  }
  if (lastCopyStatus.value === "error") {
    return t("common.copyAgain");
  }
  return t("winState.shareResults");
});

function onCopy(): void {
  emit("copy");
}

const displayTargetAnimal = computed(() => {
  if (!targetAnimal.value || !babyMode.value) {
    return targetAnimal.value;
  }
  const key = `babyMode.organisms.${targetAnimal.value.id}`;
  if (te(key)) {
    return { ...targetAnimal.value, name: t(key) };
  }
  return targetAnimal.value;
});

const isGalleryOpen = ref(false);
const imageLoadFailed = ref(false);

const sanitizedTargetDescription = computed(() => {
  if (!targetAnimal.value?.description) return "";
  return sanitizeBasicHTML(targetAnimal.value.description);
});

/** Baby mode keeps the animal card; phylo metrics / share stay hidden. */
const showTargetCard = computed(() => Boolean(displayTargetAnimal.value));
const showTargetDescription = computed(
  () => Boolean(sanitizedTargetDescription.value),
);
const showPhyloMetrics = computed(
  () => !babyMode.value && Boolean(phyloMetrics.value),
);
const showShare = computed(
  () => !babyMode.value && isShareReady.value,
);

const babyStickerEmoji = computed(() => {
  if (!babyMode.value || !displayTargetAnimal.value) {
    return undefined;
  }
  return stickerByAnimalId.value?.[displayTargetAnimal.value.id];
});

const showTargetImage = computed(
  () => Boolean(displayTargetAnimal.value?.imageUrl) && !imageLoadFailed.value,
);

const wikipediaHref = computed(() => {
  const url = displayTargetAnimal.value?.wikipediaUrl;
  if (!url) {
    return undefined;
  }
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
});

watch(
  () => displayTargetAnimal.value?.imageUrl,
  () => {
    imageLoadFailed.value = false;
  },
);

function onTargetImageError(): void {
  imageLoadFailed.value = true;
}

function openPhotoGallery(): void {
  if (!targetAnimal.value?.id) return;
  isGalleryOpen.value = true;
}
</script>

<template>
  <div
    class="win-state__content"
    :class="isWon ? 'win-state__content--win' : 'win-state__content--loss'"
  >
    <div
      v-if="showTargetCard"
      class="win-state__reveal"
    >
      <button
        type="button"
        class="win-state__target-image-button"
        :class="{
          'win-state__target-image-button--placeholder':
            !showTargetImage && !babyStickerEmoji,
          'win-state__target-image-button--sticker':
            !showTargetImage && babyStickerEmoji,
        }"
        :aria-label="t('winState.explorePhotos', { name: displayTargetAnimal!.name })"
        data-testid="win-state-target-image-button"
        @click="openPhotoGallery"
      >
        <span class="win-state__target-image-wrap">
          <img
            v-if="showTargetImage"
            :src="displayTargetAnimal!.imageUrl"
            class="win-state__target-image"
            :alt="t('winState.imageAlt', { name: displayTargetAnimal!.name })"
            loading="lazy"
            @error="onTargetImageError"
          >
          <span
            v-else-if="babyStickerEmoji"
            class="win-state__target-sticker"
            aria-hidden="true"
          >{{ babyStickerEmoji }}</span>
          <span
            v-else
            class="win-state__target-image-placeholder-label"
          >
            {{ t("winState.galleryShort") }}
          </span>
          <span
            class="win-state__target-image-zoom"
            aria-hidden="true"
          >
            <Icon
              :name="uiIcon.zoomIn"
              class="win-state__target-image-zoom-icon"
            />
          </span>
        </span>
      </button>

      <div class="win-state__reveal-copy">
        <div class="win-state__target-names">
          <p class="win-state__target-common">
            <strong>{{ displayTargetAnimal!.name }}</strong>
          </p>
          <p
            v-if="displayTargetAnimal!.scientificName"
            class="win-state__target-scientific"
          >
            <em>{{ displayTargetAnimal!.scientificName }}</em>
          </p>
        </div>
        <div
          v-if="displayTargetAnimal!.url || wikipediaHref"
          class="win-state__target-links"
        >
          <a
            v-if="displayTargetAnimal!.url"
            :href="displayTargetAnimal!.url"
            target="_blank"
            rel="noopener noreferrer"
            class="win-state__target-link"
            :aria-label="t('winState.viewOnINaturalist')"
          >
            <Icon :name="uiIcon.externalLink" />
            iNaturalist
          </a>
          <a
            v-if="wikipediaHref"
            :href="wikipediaHref"
            target="_blank"
            rel="noopener noreferrer"
            class="win-state__target-link"
            :aria-label="t('winState.viewOnWikipedia')"
          >
            <Icon :name="uiIcon.externalLink" />
            Wikipedia
          </a>
        </div>
      </div>
    </div>

    <div
      v-if="showTargetDescription"
      class="win-state__target-description-block"
      data-testid="win-state-target-description"
    >
      <!-- eslint-disable vue/no-v-html -- sanitized Wikipedia / iNat summary -->
      <div
        class="win-state__target-description"
        v-html="sanitizedTargetDescription"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <GameWinStatePhotoGallery
      v-if="showTargetCard && displayTargetAnimal"
      v-model:open="isGalleryOpen"
      :taxon-id="displayTargetAnimal.id"
      :taxon-name="displayTargetAnimal.name"
      :fallback-image-url="displayTargetAnimal.imageUrl"
    />

    <p
      class="win-state__stats"
      data-testid="win-state-stats"
    >
      {{ statsText }}
    </p>

    <div
      v-if="showPhyloMetrics"
      class="win-state__phylo-metrics"
    >
      <p class="win-state__phylo-metrics-line">
        {{ t("winState.treeDepth") }}: {{ phyloMetrics!.treeDepth }}
      </p>

      <p
        class="win-state__phylo-metrics-line win-state__phylo-metrics-line--with-help"
        data-testid="win-state-furthest-evolutionary-distance"
      >
        <span class="win-state__phylo-metrics-label">
          {{ t("winState.furthestEvolutionaryDistance") }}:
          {{ phyloMetrics!.furthestEvolutionaryDistance }}
        </span>
        <UTooltip
          :text="t('winState.furthestEvolutionaryDistanceHelp')"
          :delay-duration="0"
          :content="helpTooltipContent"
          :portal="false"
          class="inline-flex shrink-0"
          :ui="helpTooltipUi"
        >
          <button
            type="button"
            class="win-state__help-trigger"
            :aria-label="t('winState.furthestEvolutionaryDistanceHelpAria')"
          >
            <Icon
              :name="uiIcon.help"
              class="win-state__help-icon"
              aria-hidden="true"
            />
          </button>
        </UTooltip>
      </p>

      <p
        v-if="!isWon"
        class="win-state__phylo-metrics-line win-state__phylo-metrics-line--with-help"
      >
        <span class="win-state__phylo-metrics-label">
          {{ t("winState.evolutionaryDistance") }}: {{ phyloMetrics!.evolutionaryDistance }}
        </span>
        <UTooltip
          :text="t('winState.evolutionaryDistanceHelp')"
          :delay-duration="0"
          :content="helpTooltipContent"
          :portal="false"
          class="inline-flex shrink-0"
          :ui="helpTooltipUi"
        >
          <button
            type="button"
            class="win-state__help-trigger"
            :aria-label="t('winState.evolutionaryDistanceHelpAria')"
          >
            <Icon
              :name="uiIcon.help"
              class="win-state__help-icon"
              aria-hidden="true"
            />
          </button>
        </UTooltip>
      </p>
    </div>

    <div
      v-if="showShare"
      class="win-state__share"
    >
      <button
        type="button"
        class="win-state__share-button"
        data-testid="win-state-share-ready"
        :aria-label="
          lastCopyStatus === 'success'
            ? t('winState.resultsCopiedToClipboard')
            : t('winState.copyResultsToClipboard')
        "
        :title="
          lastCopyStatus === 'success'
            ? t('common.copied')
            : t('winState.copyResultsToClipboard')
        "
        :disabled="lastCopyStatus === 'success'"
        @click="onCopy"
      >
        <Icon
          :name="lastCopyStatus === 'success' ? uiIcon.check : uiIcon.share"
          class="win-state__share-icon"
          aria-hidden="true"
        />
        <span class="win-state__share-label">{{ shareButtonLabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.win-state__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 0;
  flex: 1;
}

.win-state__reveal {
  --win-state-thumb: 7.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem 1rem;
  align-items: center;
  padding: 0.85rem;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 88%, var(--color-muted, #9ca3af));
}

.dark .win-state__reveal {
  background: color-mix(in srgb, var(--color-paper, #1e293b) 88%, #64748b);
  border-color: #374151;
}

.win-state__reveal-copy {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.win-state__stats {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__stats { color: #9ca3af; }

.win-state__target-image-button {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.65rem;
  line-height: 0;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.win-state__target-image-button:hover,
.win-state__target-image-button:focus-visible {
  box-shadow: 0 0 0 2px var(--color-focus-ring, #6b7f8e);
}

.win-state__target-image-button:active {
  transform: scale(0.98);
}

.win-state__target-image-wrap {
  position: relative;
  display: block;
  width: var(--win-state-thumb);
  height: var(--win-state-thumb);
  border-radius: 0.65rem;
  overflow: hidden;
}

.win-state__target-image-button--placeholder .win-state__target-image-wrap,
.win-state__target-image-button--sticker .win-state__target-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 70%, var(--color-muted, #9ca3af));
  border: 1px dashed var(--color-border-subtle, #e2d6c3);
}

.win-state__target-image-button--sticker .win-state__target-image-wrap {
  border-style: solid;
}

.win-state__target-sticker {
  font-size: 2.75rem;
  line-height: 1;
}

.win-state__target-image-placeholder-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-ink-subtle, #6b7280);
}

.win-state__target-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 80%, var(--color-muted, #9ca3af));
}

.win-state__target-image-zoom {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: rgba(17, 24, 39, 0.55);
  color: #fff;
}

.win-state__target-image-zoom-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.dark .win-state__target-image-zoom {
  background: rgba(15, 23, 42, 0.7);
}

.win-state__target-description-block {
  margin: 0;
}

.win-state__target-description {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--color-ink-muted, #374151);
}

.win-state__target-description :deep(p) {
  margin: 0 0 0.65rem;
}

.win-state__target-description :deep(p:last-child) {
  margin-bottom: 0;
}

.dark .win-state__target-description {
  color: #d1d5db;
}

.dark .win-state__target-image {
  background: #334155;
}

.win-state__target-names {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.win-state__target-common,
.win-state__target-scientific {
  margin: 0;
  overflow-wrap: anywhere;
}

.win-state__target-common {
  font-size: 1.25rem;
  line-height: 1.3;
  color: var(--color-ink, #111827);
}

.dark .win-state__target-common { color: #f9fafb; }

.win-state__target-scientific {
  font-size: 0.9375rem;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__target-scientific { color: #9ca3af; }

.win-state__target-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.win-state__target-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-ink-muted, #374151);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.win-state__target-link:hover,
.win-state__target-link:focus-visible {
  color: var(--color-ink, #111827);
}

.dark .win-state__target-link {
  color: #d1d5db;
}

.dark .win-state__target-link:hover,
.dark .win-state__target-link:focus-visible {
  color: #f9fafb;
}

.win-state__target-link :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.7;
  flex-shrink: 0;
}

.win-state__phylo-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-ink-subtle, #6b7280);
  padding: 0.75rem 0.85rem;
  border-radius: 0.65rem;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 92%, var(--color-muted, #9ca3af));
}

.dark .win-state__phylo-metrics {
  color: #9ca3af;
  background: color-mix(in srgb, var(--color-paper, #1e293b) 92%, #64748b);
  border-color: #374151;
}

.win-state__phylo-metrics-line {
  margin: 0;
}

.win-state__phylo-metrics-line--with-help {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.win-state__phylo-metrics-label {
  flex: 0 1 auto;
}

.win-state__help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: help;
  color: inherit;
  opacity: 0.75;
}

.win-state__help-trigger:hover,
.win-state__help-trigger:focus-visible {
  opacity: 1;
}

.win-state__help-icon {
  width: 1rem;
  height: 1rem;
}

.win-state__share {
  display: flex;
  width: 100%;
}

.win-state__share-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.55rem 0.9rem;
  border-radius: 0.65rem;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.win-state__share-button:hover {
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 88%, var(--color-ink, #111827));
}

.win-state__share-button:active {
  transform: translateY(0.5px);
}

.dark .win-state__share-button {
  background: #374151;
  border-color: #4b5563;
}

.dark .win-state__share-button:hover {
  background: #4b5563;
}

.win-state__share-label {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-ink, #111827);
}

.dark .win-state__share-label {
  color: #f9fafb;
}

.win-state__share-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.win-state__share-icon {
  width: 1.15rem;
  height: 1.15rem;
}

@media (max-width: 767px) {
  .win-state__content {
    gap: 1rem;
  }

  .win-state__reveal {
    --win-state-thumb: 6.25rem;
    padding: 0.7rem;
  }

  .win-state__target-common {
    font-size: 1.125rem;
  }
}
</style>
