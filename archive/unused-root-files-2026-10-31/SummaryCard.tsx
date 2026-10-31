// src/components/SummaryCard.tsx
// =============================================================================
// The hero balance card displayed at the top of the Dashboard.
//
// Design: Inverted panel — ink-black background, cream type. The single
// element on the screen that breaks the cream field. The balance number
// is set in the Playfair Display Black at display scale — the typographic
// centrepiece of the entire app.
//
// Cents handling:
//   Accepts raw integer cents from the backend (total_balance_cents).
//   Uses formatCurrency() internally — nothing outside this component
//   needs to know how to convert the value.
//
// States:
//   loading  → animated shimmer skeleton that matches the card's layout
//   error    → muted "—" balance with error label
//   data     → full balance display with month-over-month delta indicator
// =============================================================================

import React, { useRef, useEffect } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";
import { formatCurrency } from "../utils/currency";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SummaryCardProps {
  /** Total balance across all accounts, in integer cents from the backend */
  totalBalanceCents: number | undefined;
  /** Month-over-month spending delta in cents — negative = spent more */
  monthDeltaCents?:  number;
  /** The user's configured currency symbol, e.g. "$" */
  currencySymbol:    string;
  loading?:          boolean;
  error?:            boolean;
  style?:            ViewStyle;
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function ShimmerBar({ width, height, style }: { width: number | string; height: number; style?: ViewStyle }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius:    RADIUS.sm,
          backgroundColor: "#3A3830",  // Slightly lighter than the card bg
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SummaryCard({
  totalBalanceCents,
  monthDeltaCents,
  currencySymbol,
  loading = false,
  error   = false,
  style,
}: SummaryCardProps) {

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.card, style]}>
        <ShimmerBar width={80}  height={11} style={{ marginBottom: SPACE.lg }} />
        <ShimmerBar width={200} height={44} style={{ marginBottom: SPACE.sm }} />
        <ShimmerBar width={120} height={13} />
      </View>
    );
  }

  const formattedBalance = error || totalBalanceCents === undefined
    ? "—"
    : formatCurrency(totalBalanceCents, currencySymbol);

  const hasDelta    = monthDeltaCents !== undefined && !error;
  const deltaSign   = (monthDeltaCents ?? 0) >= 0 ? "+" : "";
  const deltaFormatted = hasDelta
    ? `${deltaSign}${formatCurrency(monthDeltaCents!, currencySymbol)} this month`
    : null;
  const deltaPositive = (monthDeltaCents ?? 0) >= 0;

  // Current month label
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year:  "numeric",
  }).toUpperCase();

  return (
    <View style={[styles.card, style]}>
      {/* ── Month label ────────────────────────────────────────────────── */}
      <Text style={styles.monthLabel}>{monthLabel}</Text>

      {/* ── Total balance ──────────────────────────────────────────────── */}
      <View style={styles.balanceRow}>
        <Text
          style={styles.balanceAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {formattedBalance}
        </Text>
      </View>

      {/* ── Subtitle row ───────────────────────────────────────────────── */}
      <View style={styles.subtitleRow}>
        <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
        {deltaFormatted && (
          <View style={[styles.deltaBadge, deltaPositive ? styles.deltaBadgePos : styles.deltaBadgeNeg]}>
            <Text style={[styles.deltaText, deltaPositive ? styles.deltaTextPos : styles.deltaTextNeg]}>
              {deltaFormatted}
            </Text>
          </View>
        )}
      </View>

      {/* ── Decorative rule ────────────────────────────────────────────── */}
      <View style={styles.decorRule} />

      {error && (
        <Text style={styles.errorNote}>Could not load balance data</Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgInvert,
    padding:         SPACE.lg,
    // No border radius — the card bleeds full-width edge to edge
  },

  monthLabel: {
    fontFamily:    FONTS.bodyMedium,
    fontSize:      FONT_SIZE.xs,
    color:         "#6B6860",       // Subdued warm grey on dark bg
    letterSpacing: 2,
    marginBottom:  SPACE.md,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems:    "flex-end",
    marginBottom:  SPACE.sm,
  },
  balanceAmount: {
    fontFamily:    FONTS.displayBlack,
    fontSize:      FONT_SIZE.display,
    color:         COLORS.inkInvert,
    lineHeight:    FONT_SIZE.display * 1.0,
    letterSpacing: -1.5,
    flex:          1,
  },

  subtitleRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            SPACE.sm,
    flexWrap:       "wrap",
  },
  totalLabel: {
    fontFamily:    FONTS.bodyMedium,
    fontSize:      FONT_SIZE.xs,
    color:         "#6B6860",
    letterSpacing: 2,
  },
  deltaBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical:   3,
    borderRadius:      RADIUS.sm,
  },
  deltaBadgePos: { backgroundColor: "rgba(45,106,79,0.25)" },
  deltaBadgeNeg: { backgroundColor: "rgba(193,18,31,0.25)" },
  deltaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.xs,
    letterSpacing: 0.3,
  },
  deltaTextPos: { color: "#7ECBA1" },
  deltaTextNeg: { color: "#F4827C" },

  decorRule: {
    height:          1,
    backgroundColor: "#2A2924",
    marginTop:       SPACE.lg,
  },
  errorNote: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      "#6B6860",
    marginTop:  SPACE.sm,
  },
});
