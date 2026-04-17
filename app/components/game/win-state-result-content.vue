<script setup lang="ts">
import { computed, toRefs, useId } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import type { PhylogeneticMetrics } from "~/utils/sharingFormatter";
import { uiIcon } from "~/utils/uiIcons";

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

const shareButtonLabel = computed(() => {
  if (lastCopyStatus.value === "success") {
    return "Copied!";
  }
  if (lastCopyStatus.value === "error") {
    return "Copy again";
  }
  return "Share results";
});

const evolHelpId = useId();
const furthestHelpId = useId();

function onCopy(): void {
  emit("copy");
}

function onNodeClick(node: TreeNode): void {
  emit("nodeClick", node);
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
        <img
          v-if="targetAnimal.imageUrl"
          :src="targetAnimal.imageUrl"
          class="win-state__target-image"
          :alt="`Image of ${targetAnimal.name}`"
          loading="lazy"
        >
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
            aria-label="View on iNaturalist"
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
            aria-label="View on Wikipedia"
          >
            <Icon :name="uiIcon.externalLink" />
            Wikipedia
          </a>
        </div>
      </div>
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
              Tree depth: {{ phyloMetrics.treeDepth }}
            </p>

            <p
              class="win-state__phylo-metrics-line win-state__phylo-metrics-line--with-help"
              data-testid="win-state-furthest-evolutionary-distance"
            >
              <span class="win-state__phylo-metrics-label">
                Furthest evolutionary distance: {{ phyloMetrics.furthestEvolutionaryDistance }}
              </span>
              <span class="win-state__help-wrap">
                <button
                  type="button"
                  class="win-state__help-trigger"
                  :aria-describedby="furthestHelpId"
                  aria-label="What is furthest evolutionary distance?"
                >
                  <Icon
                    :name="uiIcon.help"
                    class="win-state__help-icon"
                    aria-hidden="true"
                  />
                </button>
                <span
                  :id="furthestHelpId"
                  role="tooltip"
                  class="win-state__tooltip"
                >
                  {{ "Distance from the target to the most distant animal shown in the tree. "
                    + "Higher means at least one far relationship appears in this tree." }}
                </span>
              </span>
            </p>

            <p
              v-if="!isWon"
              class="win-state__phylo-metrics-line win-state__phylo-metrics-line--with-help"
            >
              <span class="win-state__phylo-metrics-label">
                Evolutionary distance: {{ phyloMetrics.evolutionaryDistance }}
              </span>
              <span class="win-state__help-wrap">
                <button
                  type="button"
                  class="win-state__help-trigger"
                  :aria-describedby="evolHelpId"
                  aria-label="What is evolutionary distance?"
                >
                  <Icon
                    :name="uiIcon.help"
                    class="win-state__help-icon"
                    aria-hidden="true"
                  />
                </button>
                <span
                  :id="evolHelpId"
                  role="tooltip"
                  class="win-state__tooltip"
                >
                  {{ "How close your best guess was on the taxonomy ladder: lower is closer to the "
                    + "target. When you did not find the target, this counts how many "
                    + "taxonomic ranks "
                    + "still separated your closest guess from the target’s deepest level." }}
                </span>
              </span>
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
                  ? 'Results copied to clipboard'
                  : 'Copy results to clipboard'
              "
              :title="
                lastCopyStatus === 'success'
                  ? 'Copied!'
                  : 'Copy results to clipboard'
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
        Complete Phylogenetic Tree
      </h3>
      <p
        class="win-state__learning-footnote"
        data-testid="win-state-learning-footnote"
      >
        Every guess traces a real branch of life, take a moment to see how species connect.
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.win-state__target-image {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.5rem;
  object-fit: cover;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
  flex: 0 0 auto;
}

.dark .win-state__target-image {
  background: var(--color-ink, #1f2937);
  border-color: #374151;
}

.win-state__target-names {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 0.15rem;
  flex: 1;
}

.win-state__target-common {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--color-ink-muted, #374151);
}

.dark .win-state__target-common { color: #d1d5db; }

.win-state__target-scientific {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__target-scientific { color: #9ca3af; }

.win-state__target-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.2rem;
  flex: 0 0 auto;
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

.win-state__help-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
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

.win-state__tooltip {
  position: absolute;
  z-index: 80;
  left: 50%;
  bottom: calc(100% + 0.35rem);
  width: min(240px, 70vw);
  transform: translateX(-50%);
  padding: 0.5rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--color-ink, #111827);
  background: var(--color-paper, #fdfbf5);
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  border-radius: 0.375rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
}

.dark .win-state__tooltip {
  color: #f9fafb;
  background: var(--color-ink, #1f2937);
  border-color: #374151;
}

.win-state__help-wrap:hover .win-state__tooltip,
.win-state__help-wrap:focus-within .win-state__tooltip {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.win-state__share-button {
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
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  box-shadow: none;
  min-height: 200px;
}

.dark .win-state__tree-container { background: transparent; }

@media (max-width: 767px) {
  .win-state__content {
    gap: 1rem;
  }

  .win-state__target-meta {
    gap: 0.5rem;
  }

  .win-state__target-image {
    width: 2.75rem;
    height: 2.75rem;
  }

  .win-state__target-meta {
    align-items: flex-start;
  }
}
</style>
