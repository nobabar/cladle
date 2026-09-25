<script setup lang="ts">
import { computed } from "vue";
import { resolveDocumentOverlayReturnPath } from "~/utils/documentOverlayReturn";

const { t } = useI18n();

const title = computed(() => t("help.metaTitle"));
const description = computed(() => t("help.metaDescription"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});

/**
 * Close to the previous in-app page (or home) with history replacement so
 * browser scroll restoration does not jump back to the footer click position.
 */
function closeDocumentOverlay() {
  navigateTo(resolveDocumentOverlayReturnPath(), { replace: true });
}

function startTourFromHelp() {
  navigateTo({ path: "/", query: { startTour: "1" } }, { replace: true });
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
    <DocumentOverlay labelled-by="help-document-title" @close="closeDocumentOverlay">
      <HelpDocument @start-tour="startTourFromHelp" />
    </DocumentOverlay>
  </div>
</template>
