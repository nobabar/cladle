<script setup lang="ts">
import { computed } from "vue";
import { useReadableFont } from "~/composables/useReadableFont";
import { useUiIcons } from "~/composables/useUiIcons";
import { useUserPreferences } from "~/composables/useUserPreferences";
import type { ColorModeUserPreference } from "~/composables/useUserPreferences";
import { useResponsive } from "~/composables/useResponsive";

const isOpen = defineModel<boolean>("open", { default: false });

const { isMobile } = useResponsive();

const { t } = useI18n();
const {
  locale,
  colorModePreference,
  setColorModePreference,
  updateLocale,
  supportedLocales,
} = useUserPreferences();

const { readableFontPreference, setReadableFontPreference } = useReadableFont();
const icons = useUiIcons();

const languageOptions = computed(() =>
  supportedLocales.map(option => ({
    code: option.code,
    label: option.label,
  })),
);

const colorModeOptions = computed(() => {
  const i = icons.value;
  const options: {
    value: ColorModeUserPreference;
    labelKey: string;
    ariaKey: string;
    icons: readonly string[];
  }[] = [
    {
      value: "system",
      labelKey: "profile.colorMode.system",
      ariaKey: "profile.colorMode.ariaSystem",
      icons: [isMobile.value ? i.phone : i.computer],
    },
    {
      value: "light",
      labelKey: "profile.colorMode.light",
      ariaKey: "profile.colorMode.ariaLight",
      icons: [i.sun],
    },
    {
      value: "dark",
      labelKey: "profile.colorMode.dark",
      ariaKey: "profile.colorMode.ariaDark",
      icons: [i.moon],
    },
  ];
  return options;
});

const readableFontOptions = [
  {
    value: "on" as const,
    labelKey: "profile.readableFont.on",
    ariaKey: "profile.readableFont.ariaOn",
  },
  {
    value: "off" as const,
    labelKey: "profile.readableFont.off",
    ariaKey: "profile.readableFont.ariaOff",
  },
];
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('profile.title')">
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ t("profile.colorMode.label") }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in colorModeOptions"
              :key="option.value"
              :variant="colorModePreference === option.value ? 'solid' : 'soft'"
              color="neutral"
              :aria-label="t(option.ariaKey)"
              :title="t(option.ariaKey)"
              @click="setColorModePreference(option.value)"
            >
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-0.5 shrink-0"
                  aria-hidden="true"
                >
                  <UIcon
                    v-for="name in option.icons"
                    :key="name"
                    :name="name"
                    class="size-4"
                  />
                </span>
                {{ t(option.labelKey) }}
              </span>
            </UButton>
          </div>
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

        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ t("profile.readableFont.label") }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in readableFontOptions"
              :key="option.value"
              :variant="readableFontPreference === option.value ? 'solid' : 'soft'"
              color="neutral"
              :aria-label="t(option.ariaKey)"
              :title="t(option.ariaKey)"
              @click="setReadableFontPreference(option.value)"
            >
              {{ t(option.labelKey) }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
