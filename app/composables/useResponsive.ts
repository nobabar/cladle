import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * Responsive breakpoint composable
 * Provides reactive breakpoint detection for mobile-first responsive design
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 *
 * @returns Object containing windowWidth and breakpoint flags (isMobile, isTablet, isDesktop, isMobileOrTablet)
 */
export function useResponsive() {
  const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1024);

  function updateWidth() {
    if (typeof window !== "undefined") {
      windowWidth.value = window.innerWidth;
    }
  }

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleResize() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(updateWidth, 150);
  }

  onMounted(() => {
    if (typeof window !== "undefined") {
      updateWidth();
      window.addEventListener("resize", handleResize);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    }
  });

  const isMobile = computed(() => windowWidth.value < 768);
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);
  const isDesktop = computed(() => windowWidth.value >= 1024);
  const isMobileOrTablet = computed(() => windowWidth.value < 1024);

  return {
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,
  };
}
