<script setup lang="ts">
useHead({
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [
    { rel: "icon", href: "/favicon.ico" },
  ],
  htmlAttrs: {
    lang: "en",
  },
});

const title = "Cladle - Phylogenetic Guessing Game";
const description = "A web-based phylogenetic guessing game where players guess animals and see evolutionary relationships visualized in a phylogenetic tree.";

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
