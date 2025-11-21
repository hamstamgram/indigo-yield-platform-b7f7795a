/**
 * Unified Design Token System
 * Centralized design tokens for consistent UI across web and iOS
 */

// Typography tokens - Montserrat based
export const typography = {
  fontFamily: {
    sans: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem", // 60px
    "7xl": "4.5rem", // 72px
    "8xl": "6rem", // 96px
    "9xl": "8rem", // 128px
  },
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
};

// Color tokens - HSL based for easy theming
export const colors = {
  // Brand colors
  primary: {
    DEFAULT: "hsl(222.2 47.4% 11.2%)",
    foreground: "hsl(210 40% 98%)",
    50: "hsl(210 40% 98%)",
    100: "hsl(215 30% 92%)",
    200: "hsl(217 25% 84%)",
    300: "hsl(219 23% 70%)",
    400: "hsl(221 30% 50%)",
    500: "hsl(222.2 47.4% 11.2%)",
    600: "hsl(223 50% 10%)",
    700: "hsl(224 52% 8%)",
    800: "hsl(225 55% 6%)",
    900: "hsl(226 58% 4%)",
  },
  secondary: {
    DEFAULT: "hsl(210 40% 96.1%)",
    foreground: "hsl(222.2 47.4% 11.2%)",
    50: "hsl(210 40% 98%)",
    100: "hsl(210 40% 96.1%)",
    200: "hsl(210 35% 92%)",
    300: "hsl(210 30% 85%)",
    400: "hsl(210 25% 70%)",
    500: "hsl(210 20% 50%)",
    600: "hsl(210 25% 40%)",
    700: "hsl(210 30% 30%)",
    800: "hsl(210 35% 20%)",
    900: "hsl(210 40% 10%)",
  },
  // Semantic colors
  success: {
    DEFAULT: "hsl(142 76% 36%)",
    foreground: "hsl(0 0% 100%)",
    light: "hsl(142 70% 45%)",
    dark: "hsl(142 80% 28%)",
  },
  warning: {
    DEFAULT: "hsl(38 92% 50%)",
    foreground: "hsl(0 0% 0%)",
    light: "hsl(38 90% 60%)",
    dark: "hsl(38 94% 40%)",
  },
  error: {
    DEFAULT: "hsl(0 84.2% 60.2%)",
    foreground: "hsl(210 40% 98%)",
    light: "hsl(0 80% 70%)",
    dark: "hsl(0 88% 50%)",
  },
  info: {
    DEFAULT: "hsl(217 91% 60%)",
    foreground: "hsl(0 0% 100%)",
    light: "hsl(217 88% 70%)",
    dark: "hsl(217 94% 50%)",
  },
  // Neutral colors
  gray: {
    50: "hsl(210 20% 98%)",
    100: "hsl(210 20% 96%)",
    200: "hsl(210 20% 90%)",
    300: "hsl(210 20% 82%)",
    400: "hsl(210 15% 65%)",
    500: "hsl(210 10% 50%)",
    600: "hsl(210 15% 40%)",
    700: "hsl(210 20% 30%)",
    800: "hsl(210 25% 20%)",
    900: "hsl(210 30% 10%)",
  },
};

// Spacing tokens - based on 4px grid
export const spacing = {
  0: "0",
  px: "1px",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  11: "2.75rem", // 44px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  28: "7rem", // 112px
  32: "8rem", // 128px
  36: "9rem", // 144px
  40: "10rem", // 160px
  44: "11rem", // 176px
  48: "12rem", // 192px
  52: "13rem", // 208px
  56: "14rem", // 224px
  60: "15rem", // 240px
  64: "16rem", // 256px
  72: "18rem", // 288px
  80: "20rem", // 320px
  96: "24rem", // 384px
};

// Border radius tokens
export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  "3xl": "1.5rem", // 24px
  full: "9999px",
};

// Shadow tokens
export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
};

// Animation tokens
export const animation = {
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    slower: "700ms",
    slowest: "1000ms",
  },
  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};

// Breakpoint tokens
export const breakpoints = {
  xs: "320px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

// Z-index tokens
export const zIndex = {
  auto: "auto",
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  notification: 800,
  commandPalette: 900,
  max: 999,
};

// Opacity tokens
export const opacity = {
  0: "0",
  5: "0.05",
  10: "0.1",
  20: "0.2",
  25: "0.25",
  30: "0.3",
  40: "0.4",
  50: "0.5",
  60: "0.6",
  70: "0.7",
  75: "0.75",
  80: "0.8",
  90: "0.9",
  95: "0.95",
  100: "1",
};

// iOS specific mappings
export const iosTokens = {
  // Map to iOS semantic colors
  colors: {
    label: colors.gray[900],
    secondaryLabel: colors.gray[600],
    tertiaryLabel: colors.gray[400],
    quaternaryLabel: colors.gray[300],
    systemBackground: colors.gray[50],
    secondarySystemBackground: colors.gray[100],
    tertiarySystemBackground: "#ffffff",
    systemGroupedBackground: colors.gray[50],
    secondarySystemGroupedBackground: "#ffffff",
    tertiarySystemGroupedBackground: colors.gray[100],
    separator: colors.gray[300],
    opaqueSeparator: colors.gray[200],
    link: colors.info.DEFAULT,
    systemRed: colors.error.DEFAULT,
    systemGreen: colors.success.DEFAULT,
    systemBlue: colors.info.DEFAULT,
    systemOrange: colors.warning.DEFAULT,
    systemYellow: colors.warning.light,
    systemPink: "#ff2d55",
    systemPurple: "#af52de",
    systemTeal: "#5ac8fa",
    systemIndigo: "#5856d6",
    systemGray: colors.gray[500],
    systemGray2: colors.gray[400],
    systemGray3: colors.gray[300],
    systemGray4: colors.gray[200],
    systemGray5: colors.gray[100],
    systemGray6: colors.gray[50],
  },
  // Map to iOS text styles
  typography: {
    largeTitle: {
      fontSize: "34pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.tight,
    },
    title1: {
      fontSize: "28pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.tight,
    },
    title2: {
      fontSize: "22pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.tight,
    },
    title3: {
      fontSize: "20pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.tight,
    },
    headline: {
      fontSize: "17pt",
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
    },
    body: {
      fontSize: "17pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
    callout: {
      fontSize: "16pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
    subheadline: {
      fontSize: "15pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
    footnote: {
      fontSize: "13pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
    caption1: {
      fontSize: "12pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
    caption2: {
      fontSize: "11pt",
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
    },
  },
  // Map to iOS corner radius styles
  cornerRadius: {
    small: 4,
    medium: 8,
    large: 12,
    extraLarge: 16,
    continuous: 20, // iOS continuous corner radius
  },
};

// Export a function to generate CSS variables
export const generateCSSVariables = () => {
  const cssVars: Record<string, string> = {};

  // Generate color variables
  Object.entries(colors).forEach(([colorName, colorValue]) => {
    if (typeof colorValue === "string") {
      cssVars[`--color-${colorName}`] = colorValue;
    } else {
      Object.entries(colorValue).forEach(([shade, value]) => {
        const key = shade === "DEFAULT" ? `--color-${colorName}` : `--color-${colorName}-${shade}`;
        cssVars[key] = value;
      });
    }
  });

  // Generate spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });

  // Generate typography variables
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value;
  });

  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    cssVars[`--font-weight-${key}`] = String(value);
  });

  // Generate radius variables
  Object.entries(borderRadius).forEach(([key, value]) => {
    cssVars[`--radius-${key}`] = value;
  });

  // Generate shadow variables
  Object.entries(shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value;
  });

  return cssVars;
};

// Export default theme object
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  opacity,
  iosTokens,
};
