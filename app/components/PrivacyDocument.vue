<script setup lang="ts">
import { computed, ref } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";

const isEmailVisible = ref(false);
const emailAddress = computed(() => ["baptiste.rousseau", "etik.com"].join("@"));
const emailHref = computed(() => `mailto:${emailAddress.value}`);

const uiIcon = useUiIcons();

function revealEmail() {
  isEmailVisible.value = true;
}
</script>

<template>
  <div class="container mx-auto max-w-3xl">
    <header class="mb-6 sm:mb-8">
      <h1
        id="privacy-document-title"
        class="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-ink)] mb-3"
      >
        Privacy
      </h1>
      <p class="text-sm sm:text-base text-[var(--color-ink-subtle)]">
        Cladle is designed to collect as little personal data as possible.
      </p>
    </header>

    <main class="space-y-6 text-sm sm:text-base text-[var(--color-ink)]">
      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          Client-only play
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          Cladle runs fully in your browser (client-side rendering). Gameplay happens on your
          device and
          there is no Cladle user account system collecting profile data.
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          Browser storage used by Cladle
        </h2>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>
            <strong>localStorage:</strong> used for persisted game state and puzzle history so
            your progress
            survives refreshes and return visits.
          </li>
          <li>
            <strong>IndexedDB:</strong> used as a local cache for taxonomy/API data to reduce
            repeat requests
            and improve responsiveness.
          </li>
        </ul>
        <p class="mt-2 text-[var(--color-ink-muted)]">
          You can remove this data at any time by clearing site data in your browser settings.
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          Third-party requests
        </h2>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>
            <strong>iNaturalist API:</strong> Cladle requests taxonomy/search data from
            <code>api.inaturalist.org</code> to power gameplay.
          </li>
          <li>
            <strong>iNaturalist links:</strong> when you open taxon pages from Cladle, your
            browser navigates
            to <code>www.inaturalist.org</code>.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          Contact
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          For privacy-related questions, please use the contact button below.
        </p>
        <div class="mt-3">
          <UButton
            v-if="!isEmailVisible"
            color="neutral"
            variant="soft"
            size="sm"
            :icon="uiIcon.mail"
            @click="revealEmail"
          >
            Reveal email
          </UButton>
          <a
            v-else
            :href="emailHref"
            class="text-[var(--color-ink-subtle)] underline underline-offset-2
              hover:text-[var(--color-ink)]"
          >
            {{ emailAddress }}
          </a>
        </div>
      </section>
    </main>
  </div>
</template>
