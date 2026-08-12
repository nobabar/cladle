<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useGameStore } from "~/stores/gameStore";
import { useUiIcons } from "~/composables/useUiIcons";
import type { ApiResponse } from "~/types/api";
import type {
  BugReportErrorCode,
  BugReportMode,
  BugReportSuccess,
} from "~/types/bugReport";
import {
  BUG_REPORT_FORM_HEADER,
  BUG_REPORT_FORM_HEADER_VALUE,
} from "~/types/bugReport";
import { formatBrowserOs } from "~/utils/browserOs";
import { treeToMermaid } from "~/utils/mermaidExporter";

const isOpen = defineModel<boolean>("open", { default: false });

const { t, te } = useI18n();
const gameStore = useGameStore();
const uiIcon = useUiIcons();

const helpTooltipUi = {
  content:
    "z-[1300] h-auto min-h-0 max-w-[min(260px,75vw)] whitespace-normal items-start gap-0 py-1.5 shadow-md",
  text: "block whitespace-normal text-xs leading-snug",
};

/** Portal + bottom side: room below the lead line, outside modal overflow. */
const helpTooltipContent = {
  side: "bottom" as const,
  align: "start" as const,
  sideOffset: 8,
  collisionPadding: 16,
};

const title = ref("");
const description = ref("");
const steps = ref("");
const mode = ref<BugReportMode>("unknown");
const browser = ref("");
const contactEmail = ref("");
const includeTree = ref(false);
const website = ref("");

const isSubmitting = ref(false);
const submitError = ref("");
const success = ref<BugReportSuccess | null>(null);

const hasTree = computed(() => Boolean(gameStore.treeData?.root));

const modeOptions = computed(() => {
  const icons = uiIcon.value;
  return [
    {
      value: "daily" as const,
      label: t("bugReport.modeDaily"),
      icon: icons.calendar,
    },
    {
      value: "free-play" as const,
      label: t("bugReport.modeFreePlay"),
      icon: icons.infinity,
    },
    {
      value: "unknown" as const,
      label: t("bugReport.modeUnknown"),
      icon: undefined as string | undefined,
    },
  ];
});

function modeFromStore(): BugReportMode {
  if (gameStore.gameMode === "daily") {
    return "daily";
  }
  if (gameStore.gameMode === "free-play") {
    return "free-play";
  }
  return "unknown";
}

function resetForm() {
  title.value = "";
  description.value = "";
  steps.value = "";
  mode.value = modeFromStore();
  browser.value = formatBrowserOs();
  contactEmail.value = "";
  includeTree.value = hasTree.value;
  website.value = "";
  isSubmitting.value = false;
  submitError.value = "";
  success.value = null;
}

watch(isOpen, (open) => {
  if (open) {
    resetForm();
  }
});

function messageForErrorCode(code: string | undefined): string {
  if (!code) {
    return t("bugReport.errorGeneric");
  }
  const key = `bugReport.errors.${code}`;
  return te(key) ? t(key) : t("bugReport.errorGeneric");
}

function extractErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const err = error as {
    data?: {
      error?: { code?: string };
      data?: { error?: { code?: string } };
    };
  };
  return err.data?.error?.code || err.data?.data?.error?.code;
}

function extractErrorMessage(error: unknown): string {
  return messageForErrorCode(extractErrorCode(error));
}

async function onSubmit() {
  if (isSubmitting.value || success.value) {
    return;
  }

  submitError.value = "";
  isSubmitting.value = true;

  const treeMermaid
    = includeTree.value && hasTree.value
      ? treeToMermaid(gameStore.treeData, false)
      : "";

  try {
    const response = await $fetch<ApiResponse<BugReportSuccess>>("/api/bug-report", {
      method: "POST",
      headers: {
        [BUG_REPORT_FORM_HEADER]: BUG_REPORT_FORM_HEADER_VALUE,
      },
      body: {
        title: title.value,
        description: description.value,
        steps: steps.value,
        mode: mode.value,
        browser: browser.value,
        contactEmail: contactEmail.value,
        treeMermaid: treeMermaid || undefined,
        website: website.value,
      },
    });

    if (response.error || !response.data) {
      submitError.value = messageForErrorCode(
        (response.error as { code?: BugReportErrorCode } | null)?.code,
      );
      return;
    }

    success.value = response.data;
  } catch (error) {
    submitError.value = extractErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

function close() {
  isOpen.value = false;
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('bugReport.title')"
    :ui="{
      content: 'sm:max-w-md',
      body: 'sm:p-5',
    }"
  >
    <template #body>
      <div
        v-if="success"
        class="bug-report-success space-y-4"
      >
        <p class="text-sm leading-relaxed text-[var(--color-ink)]">
          {{ t("bugReport.successMessage") }}
        </p>
        <a
          :href="success.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block text-sm underline underline-offset-2
            text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
        >
          {{ t("bugReport.viewIssue", { number: success.number }) }}
        </a>
        <div class="flex justify-end pt-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="close"
          >
            {{ t("bugReport.close") }}
          </UButton>
        </div>
      </div>

      <form
        v-else
        class="bug-report-form"
        @submit.prevent="onSubmit"
      >
        <p class="bug-report-lead">
          <span>{{ t("bugReport.descriptionBefore") }}</span>
          <span class="bug-report-github-term">
            {{ t("bugReport.descriptionGithubIssue") }}
            <UTooltip
              :text="t('bugReport.githubIssueHelp')"
              :delay-duration="0"
              :content="helpTooltipContent"
              :ui="helpTooltipUi"
            >
              <button
                type="button"
                class="bug-report-help-trigger"
                :aria-label="t('bugReport.githubIssueHelpAria')"
              >
                <Icon
                  :name="uiIcon.help"
                  class="bug-report-help-icon"
                  aria-hidden="true"
                />
              </button>
            </UTooltip>
          </span>
          <span>{{ t("bugReport.descriptionAfter") }}</span>
        </p>

        <!-- Honeypot -->
        <div
          class="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          aria-hidden="true"
        >
          <label>
            Website
            <input
              v-model="website"
              type="text"
              name="website"
              tabindex="-1"
              autocomplete="off"
            >
          </label>
        </div>

        <div class="bug-report-fields">
          <div class="bug-report-field">
            <label
              class="bug-report-label"
              for="bug-report-title"
            >
              {{ t("bugReport.fieldTitle") }}
              <span
                class="bug-report-required"
                :aria-label="t('bugReport.required')"
              >*</span>
            </label>
            <UInput
              id="bug-report-title"
              v-model="title"
              required
              maxlength="120"
              size="lg"
              class="w-full notebook-input"
              :placeholder="t('bugReport.fieldTitlePlaceholder')"
              autocomplete="off"
            />
          </div>

          <div class="bug-report-field">
            <label
              class="bug-report-label"
              for="bug-report-description"
            >
              {{ t("bugReport.fieldDescription") }}
              <span
                class="bug-report-required"
                :aria-label="t('bugReport.required')"
              >*</span>
            </label>
            <UTextarea
              id="bug-report-description"
              v-model="description"
              required
              :rows="3"
              maxlength="4000"
              size="lg"
              class="w-full notebook-input"
              :placeholder="t('bugReport.fieldDescriptionPlaceholder')"
              autoresize
              :ui="{ base: 'resize-y min-h-[5.5rem]' }"
            />
          </div>

          <div class="bug-report-field">
            <label
              class="bug-report-label"
              for="bug-report-steps"
            >
              {{ t("bugReport.fieldSteps") }}
              <span
                class="bug-report-required"
                :aria-label="t('bugReport.required')"
              >*</span>
            </label>
            <UTextarea
              id="bug-report-steps"
              v-model="steps"
              required
              :rows="3"
              maxlength="4000"
              size="lg"
              class="w-full notebook-input"
              :placeholder="t('bugReport.fieldStepsPlaceholder')"
              autoresize
              :ui="{ base: 'resize-y min-h-[5.5rem]' }"
            />
          </div>

          <div class="bug-report-field">
            <p
              id="bug-report-mode-label"
              class="bug-report-label"
            >
              {{ t("bugReport.fieldMode") }}
            </p>
            <div
              class="bug-report-mode-options"
              role="group"
              aria-labelledby="bug-report-mode-label"
            >
              <UButton
                v-for="option in modeOptions"
                :key="option.value"
                type="button"
                :variant="mode === option.value ? 'solid' : 'soft'"
                color="neutral"
                size="sm"
                :icon="option.icon"
                class="bug-report-mode-btn"
                @click="mode = option.value"
              >
                {{ option.label }}
              </UButton>
            </div>
          </div>

          <div class="bug-report-field">
            <label
              class="bug-report-checkbox"
              :class="{ 'bug-report-checkbox--disabled': !hasTree }"
            >
              <input
                v-model="includeTree"
                type="checkbox"
                class="bug-report-checkbox-input"
                :disabled="!hasTree"
              >
              <span class="bug-report-checkbox-copy">
                <span class="bug-report-checkbox-label">
                  {{ t("bugReport.fieldIncludeTree") }}
                </span>
                <span class="bug-report-hint">
                  {{
                    hasTree
                      ? t("bugReport.fieldIncludeTreeHint")
                      : t("bugReport.fieldIncludeTreeUnavailable")
                  }}
                </span>
              </span>
            </label>
          </div>

          <div class="bug-report-field">
            <label
              class="bug-report-label"
              for="bug-report-browser"
            >
              {{ t("bugReport.fieldBrowser") }}
            </label>
            <UInput
              id="bug-report-browser"
              v-model="browser"
              required
              maxlength="200"
              size="lg"
              class="w-full notebook-input"
              :placeholder="t('bugReport.fieldBrowserPlaceholder')"
              autocomplete="off"
            />
          </div>

          <div class="bug-report-field">
            <label
              class="bug-report-label"
              for="bug-report-email"
            >
              {{ t("bugReport.fieldEmail") }}
              <span class="bug-report-optional">
                {{ t("bugReport.optional") }}
              </span>
            </label>
            <UInput
              id="bug-report-email"
              v-model="contactEmail"
              type="email"
              maxlength="254"
              size="lg"
              class="w-full notebook-input"
              placeholder="you@example.com"
              autocomplete="email"
            />
            <p class="bug-report-hint">
              {{ t("bugReport.fieldEmailHint") }}
            </p>
          </div>
        </div>

        <p
          v-if="submitError"
          class="bug-report-error"
          role="alert"
        >
          {{ submitError }}
        </p>

        <div class="bug-report-actions">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :disabled="isSubmitting"
            @click="close"
          >
            {{ t("bugReport.cancel") }}
          </UButton>
          <UButton
            type="submit"
            color="neutral"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ t("bugReport.submit") }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>

<style scoped>
.bug-report-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bug-report-lead {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-ink-subtle);
}

.bug-report-github-term {
  display: inline;
  white-space: nowrap;
}

.bug-report-help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 0 0.15rem;
  padding: 0;
  border: none;
  background: transparent;
  vertical-align: -0.1em;
  cursor: help;
  color: var(--color-ink-subtle);
  opacity: 0.85;
}

.bug-report-help-trigger:hover,
.bug-report-help-trigger:focus-visible {
  opacity: 1;
  color: var(--color-ink);
}

.bug-report-help-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.bug-report-fields {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.bug-report-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  width: 100%;
}

.bug-report-label {
  display: block;
  width: 100%;
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-ink);
}

.bug-report-optional {
  margin-left: 0.35rem;
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--color-ink-subtle);
}

.bug-report-required {
  margin-left: 0.15rem;
  font-weight: 700;
  color: var(--color-error);
}

.bug-report-optional::before {
  content: "(";
}

.bug-report-optional::after {
  content: ")";
}

.bug-report-hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-ink-subtle);
}

.bug-report-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  cursor: pointer;
}

.bug-report-checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.bug-report-checkbox-input {
  margin-top: 0.2rem;
  flex-shrink: 0;
  width: 1.05rem;
  height: 1.05rem;
  min-width: 1.05rem;
  min-height: 1.05rem;
  accent-color: var(--color-primary);
  cursor: inherit;
}

.bug-report-checkbox-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.bug-report-checkbox-label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-ink);
}

.bug-report-mode-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bug-report-mode-btn {
  flex: 1 1 auto;
  justify-content: center;
  min-width: 5.5rem;
}

.bug-report-error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-error, #dc2626);
}

.bug-report-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-border-subtle);
  margin-top: 0.125rem;
}

/* Notebook field chrome — match search input */
.notebook-input :deep(input),
.notebook-input :deep(textarea) {
  width: 100%;
  background-color: var(--color-paper);
  border-color: var(--color-secondary);
  border-width: 1px;
  border-radius: 2px;
  font-size: 1rem;
  line-height: 1.45;
}

.notebook-input :deep(input:focus),
.notebook-input :deep(textarea:focus) {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px rgba(107, 127, 142, 0.12);
  outline: none;
}

.notebook-input :deep(textarea) {
  padding-block: 0.625rem;
}
</style>
