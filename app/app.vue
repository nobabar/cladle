<script setup lang="ts">
import { computed } from "vue";
import { useReadableFont } from "~/composables/useReadableFont";
import { useSyncTargetWithLocale } from "~/composables/useSyncTargetWithLocale";

/** Initialize reading-comfort cookie → `<html class="font-readable">` sync (see useReadableFont). */
useReadableFont();

/** Mystery animal name/description follow UI locale (iNaturalist + Wikipedia). */
useSyncTargetWithLocale();

const { t } = useI18n();

const title = computed(() => t("meta.title"));
const description = computed(() => t("meta.description"));

useHead({
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [
    { rel: "icon", href: "/favicon.ico" },
  ],
});

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: "summary",
});
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col">
      <main class="min-h-0 w-full flex-1">
        <NuxtPage />
      </main>
      <SiteFooter />
    </div>
  </UApp>
</template>
