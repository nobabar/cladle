<script setup lang="ts">
import { uiIcon } from "~/utils/uiIcons";

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
      <div class="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-start">
        <div class="space-y-2">
          <p class="text-sm font-semibold text-[var(--color-ink)]">
            Cladle
          </p>
          <p
            class="text-xs sm:text-sm text-[var(--color-ink-subtle)] max-w-md"
          >
            A game to learn biodiversity through phylogeny and taxonomy.
          </p>
        </div>

        <nav aria-label="Footer links" class="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              About
            </p>
            <ul class="space-y-1">
              <li>
                <NuxtLink to="/" class="site-footer-link">
                  Home
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/privacy" class="site-footer-link">
                  Privacy
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
                  <span class="sr-only">(external link)</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Taxonomy Resources
            </p>
            <ul class="space-y-1">
              <li
                v-for="resource in taxonomyResources"
                :key="resource.name"
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
                  <span class="sr-only">(external link)</span>
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
}

.site-footer-link:hover {
  color: var(--color-ink);
}

.site-footer-external-indicator {
  font-size: 0.75rem;
}
</style>
