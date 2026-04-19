<script setup lang="ts">
import { computed } from "vue";
import { useReadableFont } from "~/composables/useReadableFont";

/** Initialize reading-comfort cookie → `<html class="font-readable">` sync (see useReadableFont). */
useReadableFont();

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
      <UMain class="flex-1">
        <NuxtPage />
      </UMain>
      <SiteFooter />
    </div>
  </UApp>
</template>
