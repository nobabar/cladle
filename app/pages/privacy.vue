<script setup lang="ts">
useSeoMeta({
  title: "Privacy - Cladle",
  description: "How Cladle handles data and player privacy.",
});

/**
 * Close to `/` with history replacement so browser scroll restoration
 * does not jump back to the footer click position.
 */
function closeDocumentOverlay() {
  navigateTo("/", { replace: true });
}
</script>

<template>
  <div class="relative min-h-screen">
    <div
      class="pointer-events-none select-none"
      aria-hidden="true"
    >
      <DailyGamePage is-backdrop />
    </div>
    <DocumentOverlay labelled-by="privacy-document-title" @close="closeDocumentOverlay">
      <PrivacyDocument />
    </DocumentOverlay>
  </div>
</template>
