<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { useUiIcons } from "~/composables/useUiIcons";
import { inaturalistTaxonBrowsePhotosUrl } from "~/types/taxonGallery";
import type { TaxonGalleryPhoto } from "~/types/taxonGallery";

const props = defineProps<{
  open: boolean;
  taxonId: string;
  taxonName: string;
  /** Shown while loading or when the gallery API returns no extra photos */
  fallbackImageUrl?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { t } = useI18n();
const uiIcon = useUiIcons();
const api = useBiologicalAPI();

const photos = ref<TaxonGalleryPhoto[]>([]);
const isLoading = ref(false);
const loadFailed = ref(false);
const selectedIndex = ref(0);

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const displayPhotos = computed((): TaxonGalleryPhoto[] => {
  if (photos.value.length > 0) {
    return photos.value;
  }
  if (props.fallbackImageUrl) {
    return [{
      id: "fallback",
      mediumUrl: props.fallbackImageUrl,
      largeUrl: props.fallbackImageUrl,
    }];
  }
  return [];
});

const browsePhotosUrl = computed(() => inaturalistTaxonBrowsePhotosUrl(props.taxonId));

const hasPhotos = computed(() => displayPhotos.value.length > 0);

let previousHtmlOverflow = "";

/**
 * Default focus: middle card (index 2 when five photos are shown).
 * @param photoCount - Number of photos in the strip
 * @returns Default focus index
 */
function defaultSelectedIndex(photoCount: number): number {
  if (photoCount <= 0) return 0;
  const middle = Math.floor((photoCount - 1) / 2);
  return Math.min(2, middle);
}

function cardOffset(index: number): number {
  return index - selectedIndex.value;
}

/**
 * Visual weight for polaroid strip: center card largest and on top.
 * @param index - Photo index in displayPhotos
 * @returns CSS variables for polaroid strip styling
 */
function polaroidStyle(index: number): Record<string, string> {
  const offset = cardOffset(index);
  const abs = Math.abs(offset);
  const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.68;
  const zIndex = String(5 - abs);
  const rotate = offset === 0 ? "0deg" : `${offset * 2.5}deg`;
  const translateY = abs === 0 ? "0px" : `${abs * 6}px`;

  return {
    "--polaroid-scale": String(scale),
    "--polaroid-z": zIndex,
    "--polaroid-rotate": rotate,
    "--polaroid-translate-y": translateY,
  };
}

function lockPageScroll(): void {
  if (typeof document === "undefined") return;
  previousHtmlOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
}

function unlockPageScroll(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = previousHtmlOverflow;
}

function close(): void {
  isOpen.value = false;
}

function selectPhoto(index: number): void {
  if (index >= 0 && index < displayPhotos.value.length) {
    selectedIndex.value = index;
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.open) {
    event.preventDefault();
    close();
  }
}

function applyDefaultSelection(): void {
  selectedIndex.value = defaultSelectedIndex(displayPhotos.value.length);
}

async function loadGalleryPhotos(): Promise<void> {
  if (!props.taxonId || isLoading.value) {
    return;
  }
  isLoading.value = true;
  loadFailed.value = false;
  photos.value = [];

  const response = await api.fetchTaxonGalleryPhotos(props.taxonId);
  isLoading.value = false;

  if (response.error || !response.data) {
    loadFailed.value = true;
    applyDefaultSelection();
    return;
  }

  photos.value = response.data;
  applyDefaultSelection();
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      lockPageScroll();
      void loadGalleryPhotos();
      if (typeof window !== "undefined") {
        window.addEventListener("keydown", onKeydown);
      }
    } else {
      unlockPageScroll();
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKeydown);
      }
    }
  },
  { immediate: true },
);

watch(displayPhotos, (list) => {
  if (selectedIndex.value >= list.length) {
    applyDefaultSelection();
  }
});

onUnmounted(() => {
  unlockPageScroll();
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="win-state-gallery-overlay-enter-active"
      enter-from-class="win-state-gallery-overlay-enter-from"
      enter-to-class="win-state-gallery-overlay-enter-to"
      leave-active-class="win-state-gallery-overlay-leave-active"
      leave-from-class="win-state-gallery-overlay-leave-from"
      leave-to-class="win-state-gallery-overlay-leave-to"
    >
      <div
        v-if="isOpen"
        class="win-state-gallery-overlay"
        data-testid="win-state-gallery-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('winState.galleryStripAria')"
        @click="close"
      >
        <div
          v-if="isLoading"
          class="win-state-gallery__status"
          role="status"
          @click.stop
        >
          {{ t("winState.galleryLoading") }}
        </div>

        <template v-else-if="hasPhotos">
          <div
            class="win-state-gallery__polaroids"
            role="group"
            :aria-label="t('winState.galleryStripAria')"
            data-testid="win-state-photo-gallery"
            @click.stop
          >
            <button
              v-for="(photo, index) in displayPhotos"
              :key="photo.id"
              type="button"
              class="win-state-gallery__polaroid"
              :class="{ 'win-state-gallery__polaroid--focus': index === selectedIndex }"
              :style="polaroidStyle(index)"
              :aria-label="t('winState.gallerySelectPhoto', { index: index + 1 })"
              :aria-current="index === selectedIndex ? 'true' : undefined"
              data-testid="win-state-gallery-polaroid"
              @click="selectPhoto(index)"
            >
              <span class="win-state-gallery__polaroid-frame">
                <img
                  :src="photo.largeUrl || photo.mediumUrl"
                  :alt="t('winState.galleryImageAlt', { name: taxonName })"
                  class="win-state-gallery__polaroid-image"
                  loading="lazy"
                >
                <span
                  v-if="photo.attribution"
                  class="win-state-gallery__polaroid-caption"
                >
                  {{ photo.attribution }}
                </span>
              </span>
            </button>
          </div>

          <p
            v-if="loadFailed && displayPhotos.length <= 1"
            class="win-state-gallery__hint"
            @click.stop
          >
            {{ t("winState.galleryLoadFailed") }}
          </p>

          <a
            :href="browsePhotosUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="win-state-gallery__more-link"
            data-testid="win-state-gallery-more-link"
            @click.stop
          >
            <Icon
              :name="uiIcon.externalLink"
              aria-hidden="true"
            />
            {{ t("winState.galleryMoreOnINaturalist") }}
          </a>
        </template>

        <p
          v-else
          class="win-state-gallery__hint"
          @click.stop
        >
          {{ t("winState.galleryNoPhotos") }}
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.win-state-gallery-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.win-state-gallery__status,
.win-state-gallery__hint,
.win-state-gallery__polaroids,
.win-state-gallery__more-link {
  cursor: default;
}

.win-state-gallery__status,
.win-state-gallery__hint {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.win-state-gallery__polaroids {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
  max-width: 100%;
  padding: 0.25rem 0;
  overflow: visible;
}

.win-state-gallery__polaroid {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0 -2rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: var(--polaroid-z, 1);
  transform:
    scale(var(--polaroid-scale, 1))
    rotate(var(--polaroid-rotate, 0deg))
    translateY(var(--polaroid-translate-y, 0));
  transform-origin: center bottom;
  transition: transform 0.2s ease;
  outline: none;
}

.win-state-gallery__polaroid:first-child {
  margin-left: 0;
}

.win-state-gallery__polaroid:last-child {
  margin-right: 0;
}

.win-state-gallery__polaroid--focus {
  cursor: default;
}

.win-state-gallery__polaroid:hover:not(.win-state-gallery__polaroid--focus),
.win-state-gallery__polaroid:focus-visible:not(.win-state-gallery__polaroid--focus) {
  --polaroid-scale: 0.9;
}

.win-state-gallery__polaroid:focus-visible .win-state-gallery__polaroid-frame {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}

.win-state-gallery__polaroid-frame {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 12rem;
  padding: 0.55rem;
  background: var(--color-paper, #fdfbf5);
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  box-shadow:
    0 2px 6px rgba(44, 36, 22, 0.12),
    0 1px 2px rgba(44, 36, 22, 0.08);
}

.win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
  width: 16rem;
  box-shadow:
    0 6px 16px rgba(44, 36, 22, 0.18),
    0 2px 6px rgba(44, 36, 22, 0.1);
}

.win-state-gallery__polaroid-image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--color-surface, #f9f7f0);
}

.win-state-gallery__polaroid-caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.15rem;
  margin: 0;
  padding: 0 0.15rem;
  font-size: 0.6rem;
  line-height: 1.3;
  text-align: center;
  color: var(--color-ink-subtle, #6b7280);
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.win-state-gallery__polaroid--focus .win-state-gallery__polaroid-caption {
  font-size: 0.6875rem;
  min-height: 2.5rem;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.win-state-gallery__more-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #f9fafb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.win-state-gallery-overlay-enter-active,
.win-state-gallery-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.win-state-gallery-overlay-enter-active .win-state-gallery__polaroids,
.win-state-gallery-overlay-leave-active .win-state-gallery__polaroids {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.win-state-gallery-overlay-enter-from,
.win-state-gallery-overlay-leave-to {
  opacity: 0;
}

.win-state-gallery-overlay-enter-from .win-state-gallery__polaroids,
.win-state-gallery-overlay-leave-to .win-state-gallery__polaroids {
  transform: scale(0.96);
  opacity: 0;
}

.dark .win-state-gallery__polaroid-frame {
  background: var(--color-paper, #1e293b);
  border-color: #374151;
}

.dark .win-state-gallery__polaroid-image {
  background: #374151;
}

@media (min-width: 768px) {
  .win-state-gallery__polaroid {
    margin: 0 -2.35rem;
  }

  .win-state-gallery__polaroid-frame {
    width: 14rem;
    padding: 0.6rem;
    gap: 0.45rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
    width: 18rem;
  }

  .win-state-gallery__polaroid-caption {
    font-size: 0.65rem;
    min-height: 2.35rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-caption {
    font-size: 0.75rem;
    min-height: 2.75rem;
  }
}

@media (min-width: 1024px) {
  .win-state-gallery__polaroid {
    margin: 0 -2.85rem;
  }

  .win-state-gallery__polaroid-frame {
    width: 16.5rem;
    padding: 0.7rem;
    gap: 0.5rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
    width: 21rem;
  }

  .win-state-gallery__polaroid-caption {
    font-size: 0.7rem;
    min-height: 2.5rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-caption {
    font-size: 0.8125rem;
    min-height: 3rem;
  }
}

@media (min-width: 1280px) {
  .win-state-gallery__polaroid {
    margin: 0 -3.25rem;
  }

  .win-state-gallery__polaroid-frame {
    width: 18rem;
    padding: 0.75rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
    width: 23rem;
  }
}

@media (max-width: 767px) {
  .win-state-gallery-overlay {
    padding: 0.75rem 0.35rem;
  }

  .win-state-gallery__polaroids {
    padding: 0.25rem 0.15rem;
  }

  .win-state-gallery__polaroid {
    margin: 0 -2.1rem;
  }

  .win-state-gallery__polaroid-frame {
    width: 8rem;
    padding: 0.45rem;
    gap: 0.35rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
    width: 10rem;
  }

  .win-state-gallery__polaroid-caption {
    font-size: 0.5rem;
    min-height: 1.55rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-caption {
    font-size: 0.5625rem;
    min-height: 1.75rem;
  }
}

@media (max-width: 400px) {
  .win-state-gallery__polaroid {
    margin: 0 -2.35rem;
  }

  .win-state-gallery__polaroid-frame {
    width: 7.5rem;
  }

  .win-state-gallery__polaroid--focus .win-state-gallery__polaroid-frame {
    width: 9.25rem;
  }
}
</style>
