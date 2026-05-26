/**
 * App icon names for `<Icon>`, `<UIcon>`, and `UButton` `:icon`.
 *
 * **Hand-drawn:** local cladle SVGs + Streamline Freehand (Iconify).
 * **Lucide:** used when reading-comfort font is on (`useUiIcons()`), matching pre–1e1eb35 names.
 *
 * @see https://icon-sets.iconify.design/streamline-freehand/ — CC BY 4.0
 */
export const uiIconHandDrawn = {
  sun: "i-cladle-sun",
  moon: "i-cladle-moon",
  chevronRight: "i-cladle-arrow-single-right",
  chevronLeft: "i-cladle-arrow-single-left",
  maximize: "i-cladle-maximize",
  minimize: "i-cladle-minimize",

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
  check: "i-streamline-freehand-form-validation-check-double",
  share: "i-streamline-freehand-share-circles",
  copy: "i-streamline-freehand-copy-paste-clipboard",
  calendar: "i-streamline-freehand-calendar-date",
  preferences: "i-streamline-freehand-settings-cog-double-1",
  computer: "i-streamline-freehand-laptop-computer-smiley",
  phone: "i-streamline-freehand-mobile-phone-smartphone",
  zoomIn: "i-streamline-freehand-zoom-in-magnifier-1",
  zoomOut: "i-streamline-freehand-zoom-out-magnifier-1",
  fitView: "i-streamline-freehand-retract-shrink-arrow",
} as const;

/** Lucide set (Iconify `i-lucide-*`) */
export const uiIconLucide = {
  sun: "i-lucide-sun",
  moon: "i-lucide-moon",
  chevronRight: "i-lucide-chevron-right",
  chevronLeft: "i-lucide-chevron-left",

  return: "i-lucide-arrow-left",
  history: "i-lucide-history",
  infinity: "i-lucide-infinity",
  menu: "i-lucide-menu",
  circleX: "i-lucide-circle-x",
  refresh: "i-lucide-refresh-cw",
  mail: "i-lucide-mail",
  externalLink: "i-lucide-external-link",
  close: "i-lucide-x",
  help: "i-lucide-help-circle",
  check: "i-lucide-check",
  share: "i-lucide-share-2",
  copy: "i-lucide-copy",
  calendar: "i-lucide-calendar",
  preferences: "i-lucide-settings",
  computer: "i-lucide-monitor",
  phone: "i-lucide-smartphone",
  zoomIn: "i-lucide-zoom-in",
  zoomOut: "i-lucide-zoom-out",
  maximize: "i-lucide-maximize",
  minimize: "i-lucide-minimize",
  fitView: "i-lucide-fullscreen",
} as const;

export type UiIconSet = typeof uiIconHandDrawn;

export const uiIcon = uiIconHandDrawn;
