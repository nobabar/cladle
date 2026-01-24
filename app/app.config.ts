export default defineAppConfig({
  ui: {
    colors: {
      // Map Nuxt UI semantic colors to our anatomical notebook palette
      primary: "brand", // Soft Sage Green (see --color-brand-* in main.css)
      secondary: "blue", // Muted blue secondary actions and panels
      success: "green",
      warning: "amber",
      error: "red",
      info: "blue",
      neutral: "stone", // Warm neutral for text, borders, backgrounds
    },
  },
});
