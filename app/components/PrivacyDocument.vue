<script setup lang="ts">
import { computed, ref } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";

const { t } = useI18n();
const isEmailVisible = ref(false);
const emailAddress = computed(() => ["bapt09.rousseau", "gmail.com"].join("@"));
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
        {{ t("privacy.title") }}
      </h1>
      <p class="text-sm sm:text-base text-[var(--color-ink-subtle)]">
        {{ t("privacy.lead") }}
      </p>
      <p class="mt-2 text-xs sm:text-sm text-[var(--color-ink-subtle)]">
        {{ t("privacy.lastUpdated", { date: t("privacy.lastUpdatedDate") }) }}
      </p>
    </header>

    <main class="space-y-6 text-sm sm:text-base text-[var(--color-ink)]">
      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.controllerTitle") }}
        </h2>
        <div class="space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("privacy.controllerP1") }}</p>
          <p>{{ t("privacy.controllerP2") }}</p>
        </div>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.overviewTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.overviewP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.dataTitle") }}
        </h2>
        <h3 class="text-base sm:text-lg font-semibold mt-3 mb-2">
          {{ t("privacy.dataClientTitle") }}
        </h3>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>{{ t("privacy.dataLocalStorage") }}</li>
          <li>{{ t("privacy.dataIndexedDb") }}</li>
        </ul>
        <h3 class="text-base sm:text-lg font-semibold mt-4 mb-2">
          {{ t("privacy.dataCookiesTitle") }}
        </h3>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>
            <code>cladle_locale</code>: {{ t("privacy.dataCookieLocale") }}
          </li>
          <li>
            <code>readable-font</code>: {{ t("privacy.dataCookieFont") }}
          </li>
        </ul>
        <h3 class="text-base sm:text-lg font-semibold mt-4 mb-2">
          {{ t("privacy.dataTechnicalTitle") }}
        </h3>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.dataTechnicalP1") }}
        </p>
        <h3 class="text-base sm:text-lg font-semibold mt-4 mb-2">
          {{ t("privacy.dataContactTitle") }}
        </h3>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.dataContactP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.purposesTitle") }}
        </h2>
        <p class="mb-2 text-[var(--color-ink-muted)]">
          {{ t("privacy.purposesP1") }}
        </p>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>{{ t("privacy.purposeGameplay") }}</li>
          <li>{{ t("privacy.purposeHosting") }}</li>
          <li>{{ t("privacy.purposeApi") }}</li>
          <li>{{ t("privacy.purposeContact") }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.cookiesTitle") }}
        </h2>
        <div class="space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("privacy.cookiesP1") }}</p>
          <p>{{ t("privacy.cookiesP2") }}</p>
        </div>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.recipientsTitle") }}
        </h2>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>{{ t("privacy.recipientsHosting") }}</li>
          <li>{{ t("privacy.recipientsInat") }}</li>
          <li>{{ t("privacy.recipientsNoSale") }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.transfersTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.transfersP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.retentionTitle") }}
        </h2>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>{{ t("privacy.retentionDevice") }}</li>
          <li>{{ t("privacy.retentionLogs") }}</li>
          <li>{{ t("privacy.retentionContact") }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.rightsTitle") }}
        </h2>
        <p class="mb-2 text-[var(--color-ink-muted)]">
          {{ t("privacy.rightsP1") }}
        </p>
        <ul class="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
          <li>{{ t("privacy.rightAccess") }}</li>
          <li>{{ t("privacy.rightRectify") }}</li>
          <li>{{ t("privacy.rightErase") }}</li>
          <li>{{ t("privacy.rightRestrict") }}</li>
          <li>{{ t("privacy.rightPortability") }}</li>
          <li>{{ t("privacy.rightObject") }}</li>
          <li>{{ t("privacy.rightWithdraw") }}</li>
        </ul>
        <div class="mt-2 space-y-2 text-[var(--color-ink-muted)]">
          <p>{{ t("privacy.rightsP2") }}</p>
          <p>
            {{ t("privacy.rightsCnil") }}
            <a
              href="https://www.cnil.fr/"
              target="_blank"
              rel="noopener noreferrer"
              class="underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              {{ t("privacy.rightsCnilLink") }}
            </a>
          </p>
        </div>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.analyticsTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.analyticsP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.minorsTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.minorsP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.changesTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.changesP1") }}
        </p>
      </section>

      <section>
        <h2 class="text-lg sm:text-xl font-semibold mb-2">
          {{ t("privacy.contactTitle") }}
        </h2>
        <p class="text-[var(--color-ink-muted)]">
          {{ t("privacy.contactP1") }}
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
            {{ t("privacy.revealEmail") }}
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
