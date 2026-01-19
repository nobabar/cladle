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

  /**
   * Update window width on resize
   */
  function updateWidth() {
    if (typeof window !== "undefined") {
      windowWidth.value = window.innerWidth;
    }
  }

  /**
   * Debounced resize handler for performance
   */
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleResize() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      updateWidth();
    }, 150);
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

  /**
   * Check if current viewport is mobile (< 768px)
   */
  const isMobile = computed(() => windowWidth.value < 768);

  /**
   * Check if current viewport is tablet (768px - 1023px)
   */
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);

  /**
   * Check if current viewport is desktop (>= 1024px)
   */
  const isDesktop = computed(() => windowWidth.value >= 1024);

  /**
   * Check if current viewport is mobile or tablet (< 1024px)
   */
  const isMobileOrTablet = computed(() => windowWidth.value < 1024);

  return {
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,
  };
}
