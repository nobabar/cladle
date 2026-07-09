<script setup lang="ts">
import { computed, ref } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";

interface Props {
  gameMode: "daily" | "free-play";
  isReplayMode?: boolean;
  puzzleDate?: string;
  nextPuzzleIn?: string;
  isSoon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isReplayMode: false,
  puzzleDate: "",
  nextPuzzleIn: "",
  isSoon: false,
});

const emit = defineEmits<{
  exitReplay: [];
}>();

const { t } = useI18n();
const icons = useUiIcons();
const isProfileModalOpen = ref(false);

/** Ref to open puzzle history modal from the mobile menu. */
const puzzleHistoryRef = ref<{ open: () => void } | null>(null);

function openProfileModal() {
  isProfileModalOpen.value = true;
}

/**
 * Mobile menu below `sm`: burger; from `sm` up the icon row is shown instead.
 * Preferences replaces a standalone theme toggle (theme + language live in the modal).
 */
const headerMobileMenuItems = computed(() => {
  const i = icons.value;
  const items: {
    label?: string;
    icon?: string;
    onSelect?: (e: Event) => void;
  }[] = [];

  if (props.gameMode === "daily" && !props.isReplayMode) {
    items.push({
      label: t("history.title"),
      icon: i.history,
      onSelect: () => {
        puzzleHistoryRef.value?.open();
      },
    });
  }

  if (props.gameMode === "daily") {
    items.push({
      label: t("header.freePlay"),
      icon: i.infinity,
      onSelect: () => {
        void navigateTo("/free-play");
      },
    });
  } else {
    items.push({
      label: t("header.dailyPuzzle"),
      icon: i.calendar,
      onSelect: () => {
        void navigateTo("/");
      },
    });
  }

  items.push({
    label: t("header.menuPreferences"),
    icon: i.preferences,
    onSelect: () => {
      openProfileModal();
    },
  });

  return items;
});
</script>

<template>
  <div>
    <!-- Daily: date + next-puzzle timer on top-left. -->
    <div
      v-if="props.gameMode === 'daily' && props.puzzleDate"
      class="absolute top-0 left-0 z-[1] sm:top-5 sm:left-2 flex flex-col gap-1
        sm:gap-2 items-start"
    >
      <div data-onboarding="daily-date">
        <GamePuzzleDateDisplay
          :puzzle-date="props.puzzleDate"
          format="short"
        />
      </div>
      <GameNextPuzzleTimer
        :next-puzzle-in="props.nextPuzzleIn"
        :show-timer="props.isSoon"
      />
    </div>

    <div
      v-if="props.isReplayMode"
      class="absolute top-0 left-0 sm:top-12 sm:left-2"
    >
      <UButton
        variant="ghost"
        size="sm"
        :icon="icons.return"
        :aria-label="t('header.backToToday')"
        class="text-[var(--color-ink-subtle)]"
        @click="emit('exitReplay')"
      >
        {{ t("header.backToToday") }}
      </UButton>
    </div>

    <!-- Burger below `sm`; from `sm` up: history + nav + profile. -->
    <div
      class="absolute top-0 right-0 z-[1] flex items-center gap-0.5
        sm:top-2 sm:right-2 sm:gap-1"
    >
      <UDropdownMenu
        class="sm:hidden"
        :items="headerMobileMenuItems"
        :external-icon="false"
        :content="{ align: 'start', side: 'bottom', sideOffset: 2 }"
        :ui="{ item: 'items-center' }"
      >
        <template #default="{ open: menuOpen }">
          <UButton
            :icon="icons.menu"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('header.openGameMenu')"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
              notebook-button-secondary cursor-pointer"
          />
        </template>
      </UDropdownMenu>

      <div class="hidden sm:flex items-center gap-1">
        <GamePuzzleHistory
          v-if="props.gameMode === 'daily' && !props.isReplayMode"
          ref="puzzleHistoryRef"
        />

        <UButton
          v-if="props.gameMode === 'daily'"
          to="/free-play"
          :icon="icons.infinity"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('header.goToFreePlay')"
          :title="t('header.freePlay')"
          class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
            notebook-button-secondary cursor-pointer"
        />

        <UButton
          v-if="props.gameMode === 'free-play'"
          to="/"
          :icon="icons.calendar"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('header.goToDailyPuzzle')"
          :title="t('header.dailyPuzzle')"
          class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
            notebook-button-secondary cursor-pointer"
        />

        <UButton
          data-onboarding="daily-preferences"
          :icon="icons.preferences"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('profile.openPreferences')"
          :title="t('profile.openPreferences')"
          class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
            notebook-button-secondary cursor-pointer"
          @click="openProfileModal"
        />
      </div>
    </div>

    <ProfilePreferencesModal v-model:open="isProfileModalOpen" />
  </div>
</template>
