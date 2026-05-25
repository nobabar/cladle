<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import GameWinStatePhotoGallery from "~/components/game/win-state-photo-gallery.vue";
import { useUiIcons } from "~/composables/useUiIcons";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import { sanitizeBasicHTML } from "~/utils/sanitizeBasicHTML";
import type { PhylogeneticMetrics } from "~/utils/sharingFormatter";

const props = defineProps<{
  isWon: boolean;
  statsText: string;
  targetAnimal: Animal | null;
  phyloMetrics: PhylogeneticMetrics | null;
  isShareReady: boolean;
  lastCopyStatus: "idle" | "success" | "error";
  treeData: TreeData | null;
  treeWidth: number;
  treeHeight: number;
}>();

const emit = defineEmits<{
  copy: [];
  nodeClick: [node: TreeNode];
}>();

const {
  isWon,
  statsText,
  targetAnimal,
  phyloMetrics,
  isShareReady,
  lastCopyStatus,
  treeData,
  treeWidth,
  treeHeight,
} = toRefs(props);
const { t } = useI18n();
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

function onNodeClick(node: TreeNode): void {
  emit("nodeClick", node);
}

const isGalleryOpen = ref(false);

const sanitizedTargetDescription = computed(() => {
  if (!targetAnimal.value?.description) return "";
  return sanitizeBasicHTML(targetAnimal.value.description);
});

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
    <div class="win-state__header">
      <div
        v-if="targetAnimal"
        class="win-state__target-meta"
      >
        <button
          type="button"
          class="win-state__target-image-button"
          :class="{ 'win-state__target-image-button--placeholder': !targetAnimal.imageUrl }"
          :aria-label="t('winState.explorePhotos', { name: targetAnimal.name })"
          data-testid="win-state-target-image-button"
          @click="openPhotoGallery"
        >
          <span class="win-state__target-image-wrap">
            <img
              v-if="targetAnimal.imageUrl"
              :src="targetAnimal.imageUrl"
              class="win-state__target-image"
              :alt="t('winState.imageAlt', { name: targetAnimal.name })"
              loading="lazy"
            >
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
        <div class="win-state__target-names">
          <p class="win-state__target-common">
            <strong>{{ targetAnimal.name }}</strong>
          </p>
          <p
            v-if="targetAnimal.scientificName"
            class="win-state__target-scientific"
          >
            <em>{{ targetAnimal.scientificName }}</em>
          </p>
        </div>
        <div
          v-if="targetAnimal.url || targetAnimal.wikipediaUrl"
          class="win-state__target-links"
        >
          <a
            v-if="targetAnimal.url"
            :href="targetAnimal.url"
            target="_blank"
            rel="noopener noreferrer"
            class="win-state__target-link"
            :aria-label="t('winState.viewOnINaturalist')"
          >
            <Icon :name="uiIcon.externalLink" />
            iNaturalist
          </a>
          <a
            v-if="targetAnimal.wikipediaUrl"
            :href="targetAnimal.wikipediaUrl"
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
      <div
        v-if="sanitizedTargetDescription"
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
        v-if="targetAnimal"
        v-model:open="isGalleryOpen"
        :taxon-id="targetAnimal.id"
        :taxon-name="targetAnimal.name"
        :fallback-image-url="targetAnimal.imageUrl"
      />
      <p class="win-state__stats">
        {{ statsText }}
      </p>
      <div
        v-if="phyloMetrics || isShareReady"
        class="win-state-phylo-share"
      >
        <div class="win-state-phylo-share__row">
          <div
            v-if="phyloMetrics"
            class="win-state__phylo-metrics"
          >
            <p class="win-state__phylo-metrics-line">
              {{ t("winState.treeDepth") }}: {{ phyloMetrics.treeDepth }}
            </p>

            <p
              class="win-state__phylo-metrics-line win-state__phylo-metrics-line--with-help"
              data-testid="win-state-furthest-evolutionary-distance"
            >
              <span class="win-state__phylo-metrics-label">
                {{ t("winState.furthestEvolutionaryDistance") }}:
                {{ phyloMetrics.furthestEvolutionaryDistance }}
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
                {{ t("winState.evolutionaryDistance") }}: {{ phyloMetrics.evolutionaryDistance }}
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
            v-if="isShareReady"
            class="win-state__share"
          >
            <span
              class="sr-only"
              data-testid="win-state-share-ready"
            >
              share ready
            </span>
            <button
              type="button"
              class="win-state__share-button"
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
      </div>
    </div>

    <div class="win-state__tree">
      <h3 class="win-state__tree-title">
        {{ t("winState.completePhylogeneticTree") }}
      </h3>
      <p
        class="win-state__learning-footnote"
        data-testid="win-state-learning-footnote"
      >
        {{ t("winState.learningFootnote") }}
      </p>
      <div class="win-state__tree-container">
        <GameTreeVisualization
          :tree-data="treeData"
          :show-target="true"
          :width="treeWidth"
          :height="treeHeight"
          @nodeClick="onNodeClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.win-state__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
  flex: 1;
}

.win-state__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.win-state__stats {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__stats { color: #9ca3af; }

.win-state__target-meta {
  --win-state-thumb: 5.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
  gap: 0.35rem 0.75rem;
  margin-top: 0.25rem;
  align-items: start;
}

.win-state__target-image-button {
  grid-row: 1 / -1;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.5rem;
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
  border-radius: 0.5rem;
  overflow: hidden;
}

.win-state__target-image-button--placeholder .win-state__target-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
}

.win-state__target-image-placeholder-label {
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-ink-subtle, #6b7280);
}

.win-state__target-image {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  object-fit: cover;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
  display: block;
  box-sizing: border-box;
}

.win-state__target-image-zoom {
  position: absolute;
  right: 0.2rem;
  bottom: 0.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 92%, transparent);
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  box-shadow: 0 1px 3px rgba(44, 36, 22, 0.15);
  color: var(--color-ink-muted, #374151);
  pointer-events: none;
}

.win-state__target-image-zoom-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.dark .win-state__target-image-zoom {
  background: color-mix(in srgb, var(--color-ink, #1f2937) 88%, transparent);
  border-color: #4b5563;
  color: #e5e7eb;
}

.win-state__target-description-block {
  margin-top: 0.15rem;
}

.win-state__target-description {
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-ink-muted, #374151);
}

.win-state__target-description :deep(p) {
  margin: 0 0 0.5rem;
}

.win-state__target-description :deep(p:last-child) {
  margin-bottom: 0;
}

.dark .win-state__target-description {
  color: #d1d5db;
}

.dark .win-state__target-image {
  background: var(--color-ink, #1f2937);
  border-color: #374151;
}

.win-state__target-names {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  padding-top: 0.35rem;
}

.win-state__target-common,
.win-state__target-scientific {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.35;
}

.win-state__target-common {
  color: var(--color-ink-muted, #374151);
}

.dark .win-state__target-common { color: #d1d5db; }

.win-state__target-scientific {
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__target-scientific { color: #9ca3af; }

.win-state__target-links {
  grid-column: 2;
  grid-row: 2;
  align-self: end;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
  min-width: 0;
  padding-bottom: 0.35rem;
}

.win-state__target-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-ink-muted, #6b7280);
  font-weight: 500;
  text-decoration: none;
  opacity: 0.8;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.win-state__target-link:hover,
.win-state__target-link:focus-visible {
  color: var(--color-ink, #2c2416);
  opacity: 1;
}

.dark .win-state__target-link {
  color: var(--color-ink-muted, #9ca3af);
}

.dark .win-state__target-link:hover,
.dark .win-state__target-link:focus-visible {
  color: var(--color-ink, #f9fafb);
}

.win-state__target-link :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.7;
  flex-shrink: 0;
}

.win-state-phylo-share {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.win-state-phylo-share__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  position: relative;
  z-index: 0;
}

.win-state__phylo-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.35;
  color: var(--color-ink-subtle, #6b7280);
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.dark .win-state__phylo-metrics {
  color: #9ca3af;
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

.win-state__share-button {
  position: relative;
  z-index: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-height: 1.85rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
  cursor: pointer;
  flex-shrink: 0;
}

.win-state__share-button:hover {
  background: color-mix(in srgb, var(--color-paper, #fdfbf5) 92%, var(--color-ink, #111827));
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
  font-size: 0.8125rem;
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
  width: 1.05rem;
  height: 1.05rem;
}

.win-state__tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.win-state__tree-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink, #111827);
}

.dark .win-state__tree-title { color: #f9fafb; }

.win-state__learning-footnote {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  font-style: italic;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__learning-footnote { color: #9ca3af; }

.win-state__tree-container {
  width: 100%;
  min-height: 200px;
}

@media (max-width: 767px) {
  .win-state__content {
    gap: 1rem;
  }

  .win-state__header {
    gap: 0.5rem;
  }

  .win-state__target-names {
    padding-top: 0.25rem;
  }

  .win-state__target-links {
    padding-bottom: 0.25rem;
  }

  .win-state__target-description-block {
    margin-top: 0;
  }

  .win-state__tree-container {
    max-height: 300px;
    overflow: auto;
  }

  .win-state-phylo-share__row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }

  .win-state__phylo-metrics {
    flex: none;
    width: 100%;
  }

  .win-state__share {
    display: flex;
    justify-content: center;
    width: 100%;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .win-state__tree-container {
    max-height: 400px;
    overflow: auto;
  }
}

@media (min-width: 1024px) {
  .win-state__tree-container {
    max-height: none;
    min-height: 400px;
    overflow: visible;
  }
}
</style>
