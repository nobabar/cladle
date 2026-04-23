<script setup lang="ts">
import { useUiIcons } from "~/composables/useUiIcons";

const { t } = useI18n();
const uiIcon = useUiIcons();
const route = useRoute();

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
                <a
                  href="https://github.com/nobabar/cladle"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="site-footer-link"
                >
                  GitHub
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
</style>
