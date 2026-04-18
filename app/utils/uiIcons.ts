/**
 * App icon names for `<Icon>`, `<UIcon>`, and `UButton` `:icon`.
 *
 * **Local hand-drawn SVGs** (`app/assets/icons/cladle/*.svg`, `fill="currentColor"`) are
 * registered by `@nuxt/icon` as `i-cladle-*` (see `nuxt.config.ts` → `icon.customCollections`).
 *
 * Other glyphs use Streamline Freehand via Iconify.
 * @see https://icon-sets.iconify.design/streamline-freehand/ — CC BY 4.0
 */
export const uiIcon = {
  sun: "i-cladle-sun",
  moon: "i-cladle-moon",
  chevronRight: "i-cladle-arrow-single-right",
  chevronLeft: "i-cladle-arrow-single-left",

  return: "i-streamline-freehand-keyboard-arrow-return",
  history: "i-streamline-freehand-time-hourglass-triangle",
  infinity: "i-streamline-freehand-multimedia-controls-loop-arrow",
  menu: "i-streamline-freehand-menu-navigation-2",
  circleX: "i-streamline-freehand-form-validation-remove-square",
  refresh: "i-streamline-freehand-synchronize-arrows",
  mail: "i-streamline-freehand-send-email-paper-plane-1",
  externalLink: "i-streamline-freehand-share-forward",
  close: "i-streamline-freehand-form-validation-remove-square",
  help: "i-streamline-freehand-help-question-circle",
  check: "i-streamline-freehand-form-validation-check-square-1",
  share: "i-streamline-freehand-share-circles",
  copy: "i-streamline-freehand-copy-paste-clipboard",
  calendar: "i-streamline-freehand-calendar-date",
  preferences: "i-streamline-freehand-settings-cog-double-1",
  computer: "i-streamline-freehand-laptop-computer-smiley",
  phone: "i-streamline-freehand-mobile-phone-smartphone",
} as const;
