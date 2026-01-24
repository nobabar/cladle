import type { Ref } from "vue";
import rough from "roughjs";
import type { Config } from "roughjs/bin/core";

/**
 * Rough.js rendering constants
 * roughness and strokeWidth are passed to individual draw methods, not Config
 */
const DEFAULT_ROUGHNESS = 0.4; // Subtle wobble - enough to feel hand-drawn, not distracting
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Rough.js configuration for tree rendering
 * Uses controlled roughness to maintain legibility
 * Note: Config type is minimal, most options are passed to individual draw methods
 */
const DEFAULT_ROUGH_CONFIG: Partial<Config> = {};

/**
 * Helper to get CSS variable value
 * @param variableName - CSS variable name (e.g., '--color-primary')
 * @param element - DOM element to read from (defaults to document.documentElement)
 * @returns CSS variable value or fallback
 */
function getCssVariable(
  variableName: string,
  element: HTMLElement | null = null,
): string {
  if (typeof window === "undefined") {
    return "";
  }
  const el = element || document.documentElement;
  return getComputedStyle(el).getPropertyValue(variableName).trim();
}

/**
 * Composable for Rough.js SVG rendering
 * Provides configured Rough.js instance and helper functions for tree rendering
 * @param svgElement - Optional ref to SVG element
 * @returns Object with Rough.js helper functions and generators
 */
export function useRoughSvg(svgElement?: Ref<SVGSVGElement | null>) {
  /**
   * Get a configured Rough.js generator
   * @param config - Optional config overrides
   * @returns Rough.js generator instance or null if SSR
   */
  function getRoughGenerator(config?: Partial<Config>) {
    if (typeof window === "undefined") {
      // SSR guard - return a mock generator
      return null;
    }

    if (!svgElement?.value) {
      return null;
    }

    const mergedConfig = { ...DEFAULT_ROUGH_CONFIG, ...config };
    return rough.svg(svgElement.value, mergedConfig);
  }

  /**
   * Draw a rough path (for curved tree edges)
   * @param generator - Rough.js generator
   * @param pathData - SVG path data string
   * @param color - Stroke color (CSS variable or hex)
   * @param strokeWidth - Optional stroke width override
   * @returns SVG element or null
   */
  function drawRoughPath(
    generator: ReturnType<typeof rough.svg> | null,
    pathData: string,
    color: string = "currentColor",
    strokeWidth?: number,
  ): SVGElement | null {
    if (!generator) {
      return null;
    }

    const colorValue = color.startsWith("var(")
      ? getCssVariable(color.replace(/var\(|\)/g, ""))
      : color;

    const path = generator.path(pathData, {
      stroke: colorValue || "currentColor",
      strokeWidth: strokeWidth || DEFAULT_STROKE_WIDTH,
      fill: "none",
      roughness: DEFAULT_ROUGHNESS,
    });

    return path;
  }

  /**
   * Draw a rough rectangle (for tree nodes)
   * @param generator - Rough.js generator
   * @param x - X coordinate (center or top-left based on centered param)
   * @param y - Y coordinate (center or top-left based on centered param)
   * @param width - Rectangle width
   * @param height - Rectangle height
   * @param options - Rendering options
   * @param options.fill
   * @param options.stroke
   * @param options.strokeWidth
   * @param options.borderRadius
   * @param options.centered
   * @returns SVG element or null
   */
  function drawRoughRect(
    generator: ReturnType<typeof rough.svg> | null,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      borderRadius?: number;
      centered?: boolean;
    } = {},
  ): SVGElement | null {
    if (!generator) {
      return null;
    }

    const {
      fill = "var(--color-paper)",
      stroke = "var(--color-border-subtle)",
      strokeWidth = DEFAULT_STROKE_WIDTH,
      borderRadius = 4,
      centered = true,
    } = options;

    // Adjust coordinates if centered
    const rectX = centered ? x - width / 2 : x;
    const rectY = centered ? y - height / 2 : y;

    const fillValue = fill.startsWith("var(")
      ? getCssVariable(fill.replace(/var\(|\)/g, ""))
      : fill;
    const strokeValue = stroke.startsWith("var(")
      ? getCssVariable(stroke.replace(/var\(|\)/g, ""))
      : stroke;

    // Apply border radius by using a path for rounded rectangles
    // Rough.js doesn't directly support rx/ry, so we'll use a path for rounded rectangles
    if (borderRadius > 0) {
      // Create a rounded rectangle path
      // Start from top-left corner (after radius)
      const roundedPath = `M ${rectX + borderRadius} ${rectY}
        L ${rectX + width - borderRadius} ${rectY}
        Q ${rectX + width} ${rectY} ${rectX + width} ${rectY + borderRadius}
        L ${rectX + width} ${rectY + height - borderRadius}
        Q ${rectX + width} ${rectY + height} ${rectX + width - borderRadius} ${rectY + height}
        L ${rectX + borderRadius} ${rectY + height}
        Q ${rectX} ${rectY + height} ${rectX} ${rectY + height - borderRadius}
        L ${rectX} ${rectY + borderRadius}
        Q ${rectX} ${rectY} ${rectX + borderRadius} ${rectY}
        Z`;

      const roundedRect = generator.path(roundedPath, {
        fill: fillValue || "transparent",
        stroke: strokeValue || "currentColor",
        strokeWidth,
        roughness: DEFAULT_ROUGHNESS,
        fillStyle: "solid",
        fillWeight: 0.3,
      });

      return roundedRect;
    }

    // For rectangles without border radius, use the regular rectangle method
    const rect = generator.rectangle(rectX, rectY, width, height, {
      fill: fillValue || "transparent",
      stroke: strokeValue || "currentColor",
      strokeWidth,
      roughness: DEFAULT_ROUGHNESS,
      fillStyle: "solid",
      fillWeight: 0.3,
    });

    return rect;
  }

  return {
    getRoughGenerator,
    drawRoughPath,
    drawRoughRect,
    DEFAULT_ROUGH_CONFIG,
  };
}
