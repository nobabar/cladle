<script setup lang="ts">
import { computed } from "vue";
import { DEFAULT_MAX_GUESSES } from "~/stores/gameStore";
import { formatNextUtcMidnightInLocal } from "~/utils/dateUtils";

const { t, locale } = useI18n();

const localMidnightUtc = computed(() => formatNextUtcMidnightInLocal(locale.value));

const maxGuesses = DEFAULT_MAX_GUESSES;
</script>

<template>
  <div class="container mx-auto max-w-3xl">
    <header class="mb-6 sm:mb-8">
      <h1
        id="help-document-title"
        class="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-ink)] mb-3"
      >
        {{ t("help.title") }}
      </h1>
      <p class="text-sm sm:text-base text-[var(--color-ink-subtle)]">
        {{ t("help.lead") }}
      </p>
    </header>

    <main class="space-y-6 text-sm sm:text-base text-[var(--color-ink)]">
      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("help.roundTitle") }}
        </h2>
        <div class="space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("help.roundP1") }}</p>
          <p>{{ t("help.roundP2", { maxGuesses }) }}</p>
        </div>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("help.dailyTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("help.dailyP1", { localMidnightUtc }) }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("help.freePlayTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("help.freePlayP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("help.treeTitle") }}
        </h2>
        <div class="space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("help.treeP1") }}</p>
          <p>{{ t("help.treeP2") }}</p>
        </div>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("help.termsTitle") }}
        </h2>
        <div class="space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("help.termsTaxonomyP") }}</p>
          <p>{{ t("help.termsPhylogenyP") }}</p>
        </div>
      </section>
    </main>
  </div>
</template>
