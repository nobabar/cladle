<script setup lang="ts">
import { computed } from "vue";
import { useUserPreferences } from "~/composables/useUserPreferences";
import { uiIcon } from "~/utils/uiIcons";

const isOpen = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const {
  locale,
  isDarkMode,
  toggleColorMode,
  updateLocale,
  supportedLocales,
} = useUserPreferences();

const languageOptions = computed(() =>
  supportedLocales.map(option => ({
    code: option.code,
    label: option.label,
  })),
);

const colorModeLabel = computed(() => (isDarkMode.value
  ? t("profile.colorMode.switchToLight")
  : t("profile.colorMode.switchToDark")));
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('profile.title')">
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ t("profile.colorMode.label") }}
          </p>
          <UButton
            :icon="isDarkMode ? uiIcon.sun : uiIcon.moon"
            color="neutral"
            variant="soft"
            :aria-label="colorModeLabel"
            :title="colorModeLabel"
            @click="toggleColorMode"
          >
            {{ colorModeLabel }}
          </UButton>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ t("profile.language.label") }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in languageOptions"
              :key="option.code"
              :variant="locale === option.code ? 'solid' : 'soft'"
              color="neutral"
              @click="updateLocale(option.code)"
            >
              {{ option.label }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
