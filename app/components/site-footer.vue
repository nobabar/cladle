<script setup lang="ts">
import { ref } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";

const { t } = useI18n();
const uiIcon = useUiIcons();
const route = useRoute();
const isBugReportOpen = ref(false);

function onHomeClick(event: MouseEvent) {
  if (route.path !== "/") {
    return;
  }

  // Keep native behaviors for modified/new-tab clicks.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }

  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const taxonomyResources = [
  {
    name: "iNaturalist",
    href: "https://www.inaturalist.org/",
  },
  {
    name: "Catalogue of Life",
    href: "https://www.catalogueoflife.org/",
  },
  {
    name: "Encyclopedia of Life",
    href: "https://eol.org/",
  },
];
</script>

<template>
  <footer
    class="site-footer mt-8 border-t border-[var(--color-border-subtle)] bg-[var(--color-paper)]"
  >
    <div class="container py-6 sm:py-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start lg:gap-6">
        <div class="space-y-2">
          <p class="text-sm font-semibold text-[var(--color-ink)]">
            Cladle
          </p>
          <p
            class="text-xs sm:text-sm text-[var(--color-ink-subtle)] max-w-md"
          >
            {{ t("footer.tagline") }}
          </p>
          <div class="flex items-center gap-3 pt-1">
            <a
              href="https://github.com/nobabar/cladle"
              target="_blank"
              rel="noopener noreferrer"
              class="site-footer-icon-link"
              :aria-label="`GitHub (${t('footer.externalLinkSr')})`"
              title="GitHub"
            >
              <span class="site-footer-icon-stack">
                <Icon
                  :name="uiIcon.externalLink"
                  class="site-footer-icon-external"
                  size="11"
                  aria-hidden="true"
                />
                <Icon
                  name="i-simple-icons-github"
                  class="site-footer-brand-icon"
                  size="20"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>
        </div>

        <nav :aria-label="t('footer.ariaNav')" class="flex flex-col gap-4 lg:flex-row lg:gap-8">
          <div class="min-w-0 space-y-1 sm:space-y-2 lg:min-w-max">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              {{ t("footer.about") }}
            </p>
            <ul class="flex flex-col gap-0.5 sm:gap-1">
              <li>
                <NuxtLink
                  to="/"
                  class="site-footer-link"
                  @click="onHomeClick"
                >
                  {{ t("footer.home") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/help"
                  class="site-footer-link"
                  data-onboarding="footer-help-link"
                >
                  {{ t("footer.help") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/privacy" class="site-footer-link">
                  {{ t("footer.privacy") }}
                </NuxtLink>
              </li>
              <li>
                <button
                  type="button"
                  class="site-footer-link"
                  @click="isBugReportOpen = true"
                >
                  {{ t("footer.reportBug") }}
                </button>
              </li>
            </ul>
          </div>

          <div class="min-w-0 space-y-1 sm:space-y-2 lg:min-w-max">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              {{ t("footer.resources") }}
            </p>
            <ul class="flex flex-col gap-0.5 sm:gap-1">
              <li
                v-for="resource in taxonomyResources"
                :key="resource.href"
              >
                <a
                  :href="resource.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="site-footer-link"
                >
                  {{ resource.name }}
                  <Icon
                    :name="uiIcon.externalLink"
                    class="site-footer-external-indicator"
                    aria-hidden="true"
                  />
                  <span class="sr-only">({{ t("footer.externalLinkSr") }})</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>

    <BugReportModal v-model:open="isBugReportOpen" />
  </footer>
</template>

<style scoped>
.site-footer-link {
  color: var(--color-ink-subtle);
  text-decoration: underline;
  text-underline-offset: 2px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

/* Tighter rows on small screens (body uses 1.6 line-height). */
@media (max-width: 639px) {
  .site-footer-link {
    line-height: 1.35;
  }
}

.site-footer-link:hover {
  color: var(--color-ink);
}

.site-footer-external-indicator {
  font-size: 0.75rem;
}

.site-footer-icon-link {
  color: var(--color-ink-subtle);
  display: inline-flex;
  flex-shrink: 0;
  padding: 0.35rem 0.4rem 0.1rem 0.1rem;
  border-radius: 0.25rem;
}

.site-footer-icon-link:hover {
  color: var(--color-ink);
}

.site-footer-icon-link:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* Tight box matching the GitHub icon so the overlay stays put at any viewport. */
.site-footer-icon-stack {
  position: relative;
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  line-height: 0;
  overflow: visible;
}

.site-footer-brand-icon {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
}

.site-footer-icon-external {
  position: absolute;
  top: -0.2rem;
  right: -0.2rem;
  width: 0.5rem;
  height: 0.5rem;
  line-height: 0;
  pointer-events: none;
}
</style>
