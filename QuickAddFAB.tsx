// src/components/QuickAddFAB.tsx
// =============================================================================
// Floating Action Button for quick expense entry.
//
// Design rationale:
//   In an editorial minimalist UI, a floating button should NOT be a loud
//   circle with a gradient. Instead: a rectangular ink-black pill with
//   a letterpress-style "+" mark — confident and typographic, not playful.
//   It casts a small warm shadow to lift it off the cream background.
//
// Positioning:
//   Positioned absolutely. The parent screen must have position: "relative"
//   and enough bottom padding (TAB_BAR_HEIGHT + SPACE.lg) so the FAB doesn't
//   occlude the last list item. This component doesn't impose a container —
//   the screen decides where to anchor it.
//
// Accessibility:
//   accessibilityRole="button", accessibilityLabel, and a minimum tap target
//   of 44×44pt (Apple HIG / Android minimum) are all set.
// =============================================================================

import React, { useRef, useCallback } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS, TAB_BAR_HEIGHT } from "../constants/theme";

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuickAddFABProps {
  onPress:  () => void;
  style?:   ViewStyle;
  /** Override the default "+ Add" label */
  label?:   string;
  /** Hide the FAB (e.g. when a modal is already open) */
  visible?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function QuickAddFAB({
  onPress,
  style,
  label   = "Add",
  visible = true,
}: QuickAddFABProps) {
  const scale    = useRef(new Animated.Value(1)).current;
  const opacity  = useRef(new Animated.Value(visible ? 1 : 0)).current;

  // ── Press feedback ─────────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue:         0.94,
      useNativeDriver: true,
      speed:           50,
      bounciness:      4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue:         1,
      useNativeDriver: true,
      speed:           30,
      bounciness:      8,
    }).start();
  }, [scale]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Add a new transaction"
        hitSlop={8}
      >
        {/* Crosshair "+" — set as two separate text elements so the weight
            can be independently controlled. The plus is slightly larger than
            the label to give it typographic emphasis. */}
        <Text style={styles.plus}>＋</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right:    SPACE.lg,
    bottom:   TAB_BAR_HEIGHT + SPACE.md,

    // Warm letterpress shadow
    shadowColor:   "#8A7A5A",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius:  12,
    elevation:     8,
  },

  btn: {
    flexDirection:     "row",
    alignItems:        "center",
    backgroundColor:   COLORS.ink,
    paddingVertical:   14,
    paddingHorizontal: SPACE.lg,
    borderRadius:      RADIUS.full,
    gap:               6,
    // Minimum 44pt tap target
    minWidth:  44,
    minHeight: 44,
  },

  plus: {
    fontFamily: FONTS.displayBold,
    fontSize:   FONT_SIZE.lg,
    color:      COLORS.sand,
    lineHeight: FONT_SIZE.lg,
    marginTop:  -1,  // Optical vertical alignment with label
  },

  label: {
    fontFamily:    FONTS.bodySemiBold,
    fontSize:      FONT_SIZE.base,
    color:         COLORS.inkInvert,
    letterSpacing: 0.5,
  },
});
