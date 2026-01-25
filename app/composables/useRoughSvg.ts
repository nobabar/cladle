import type { Ref } from "vue";
import rough from "roughjs";
import type { Config } from "roughjs/bin/core";

/**
 * Rough.js configuration for tree rendering
 */
const DEFAULT_ROUGH_CONFIG: Partial<Config> = {};

/**
 * Default roughness value for sketchy rendering
 * Controls how "wobbly" the lines are (0 = straight, default is 1, higher = more sketchy)
 * Can be overridden in individual drawing method options
 */
export const DEFAULT_ROUGHNESS = 1.5;

/**
 * Helper to resolve CSS variable values to actual colors
 * @param color - Color value (CSS variable like 'var(--color-primary)' or hex/rgb)
 * @param element - DOM element to read from (defaults to document.documentElement)
 * @returns Resolved color value
 */
export function resolveColor(
  color: string,
  element: HTMLElement | null = null,
): string {
  if (typeof window === "undefined") {
    return color;
  }

  if (!color.startsWith("var(")) {
    return color;
  }

  const variableName = color.replace(/var\(|\)/g, "");
  const el = element || document.documentElement;
  const resolved = getComputedStyle(el).getPropertyValue(variableName).trim();
  return resolved || color;
}

/**
 * Composable for Rough.js SVG rendering
 * Provides the Rough.js generator instance for direct use
 * @param svgElement - Optional ref to SVG element
 * @returns Rough.js generator instance or null if SSR
 */
export function useRoughSvg(svgElement?: Ref<SVGSVGElement | null>) {
  /**
   * Get a configured Rough.js generator
   * Use this generator directly with Rough.js methods:
   * - generator.rectangle(x, y, width, height, options)
   * - generator.path(pathData, options)
   * - generator.line(x1, y1, x2, y2, options)
   * - etc.
   * @param config - Optional config overrides
   * @returns Rough.js generator instance or null if SSR
   */
  function getRoughGenerator(config?: Partial<Config>) {
    if (typeof window === "undefined") {
      return null;
    }

    if (!svgElement?.value) {
      return null;
    }

    const mergedConfig = { ...DEFAULT_ROUGH_CONFIG, ...config };
    return rough.svg(svgElement.value, mergedConfig);
  }

  return {
    getRoughGenerator,
  };
}
