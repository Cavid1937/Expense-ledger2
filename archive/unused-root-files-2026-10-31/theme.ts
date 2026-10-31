// src/constants/theme.ts
// =============================================================================
// Central design token registry.
// Every color, spacing, font size, and radius used across the app lives here.
// Import this in every component — never hardcode design values inline.
//
// Aesthetic: Editorial minimalism
//   Cream paper base · Ink-black type · Single warm sand accent
//   Heavy display numerals · Newspaper-weight hairline rules
//   The feel of a well-typeset print ledger, not a tech dashboard.
// =============================================================================

export const COLORS = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bg:          "#F7F4EE",   // Warm cream — aged paper, not harsh white
  bgCard:      "#EFEBE2",   // Slightly darker card surface
  bgInvert:    "#111110",   // Near-black for hero panels
  bgSkeletonA: "#E8E3D8",   // Skeleton shimmer from
  bgSkeletonB: "#DDD8CC",   // Skeleton shimmer to

  // ── Type ────────────────────────────────────────────────────────────────────
  ink:         "#111110",   // Primary text — warm near-black (not #000 harsh)
  inkMid:      "#5C5950",   // Secondary labels
  inkMuted:    "#9C9888",   // Placeholder / tertiary
  inkInvert:   "#F7F4EE",   // Text on dark backgrounds

  // ── Accent ──────────────────────────────────────────────────────────────────
  sand:        "#C9A96E",   // Warm gold-sand — used sparingly for key moments
  sandLight:   "#DEC898",   // Lighter variant for backgrounds
  sandDark:    "#A8843E",   // Darker for pressed states

  // ── Semantic ────────────────────────────────────────────────────────────────
  positive:    "#2D6A4F",   // Income / surplus — forest green
  positiveBg:  "#EAF4EE",
  negative:    "#C1121F",   // Expense / deficit — deep red
  negativeBg:  "#FCECEA",
  neutral:     "#5C5950",   // Transfers / neutral

  // ── Borders ─────────────────────────────────────────────────────────────────
  rule:        "#D4CEBC",   // Standard hairline rule
  ruleHeavy:   "#111110",   // Bold divider / decorative rule
} as const;

export const FONTS = {
  // Display: Playfair Display — editorial, high-contrast serif
  displayBlack: "PlayfairDisplay_900Black",
  displayBold:  "PlayfairDisplay_700Bold",

  // Body: DM Sans — clean, neutral grotesque
  bodyRegular:  "DMSans_400Regular",
  bodyMedium:   "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold:     "DMSans_700Bold",
} as const;

export const RADIUS = {
  none:   0,
  sm:     4,
  md:     8,
  lg:     14,
  xl:     20,
  full:   9999,
} as const;

export const SPACE = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export const FONT_SIZE = {
  xs:     10,
  sm:     12,
  base:   14,
  md:     16,
  lg:     18,
  xl:     22,
  xxl:    28,
  xxxl:   38,
  display: 52,
} as const;

// Tab bar dimensions — used in both _layout and FAB positioning
export const TAB_BAR_HEIGHT = 72;
