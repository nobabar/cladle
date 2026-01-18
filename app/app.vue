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
    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
