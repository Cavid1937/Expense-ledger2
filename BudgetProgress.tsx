// src/components/BudgetProgress.tsx
// =============================================================================
// Budget progress card with animated ink fill bar.
//
// Design language:
//   The bar fill is ink-black up to ~80% (normal), shifts to a muted editorial
//   terracotta (#C0613A) when the alert threshold is approached, and a deeper
//   roman red when the limit is exceeded. These are desaturated, print-palette
//   tones — not the garish React-app #FF0000. The transition communicates
//   urgency without visual noise.
//
// Animation:
//   Animated.spring fills the bar on mount. This gives a single high-impact
//   entrance — the bar "settles" into position, drawing the eye to it once
//   rather than distracting with continuous animation.
//
// Data contract:
//   Accepts the enriched Budget object returned by calculateBudgetProgress()
//   which includes spent_cents, remaining_cents, percent_used, is_exceeded.
//   Amounts are always displayed via formatCurrency() — never raw cents.
// =============================================================================

import React, { useEffect, useRef, memo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";
import { formatCurrency } from "../utils/currency";

// ── Budget type (mirrors the backend enriched budget response) ────────────────
export interface EnrichedBudget {
  id:               string;
  category_id:      string | null;
  category_name:    string | null;
  category_icon:    string | null;
  category_color:   string | null;
  limit_cents:      number;
  spent_cents:      number;
  remaining_cents:  number;
  percent_used:     number;
  is_exceeded:      boolean;
  alert_triggered:  boolean;
  alert_at_percent: number;
  period:           string;
  period_start:     string;
  period_end:       string;
}

// ── Color logic ───────────────────────────────────────────────────────────────
function getBarColor(pct: number, isExceeded: boolean, alertPct: number): string {
  if (isExceeded) return "#A0352A";          // Deep Roman red — over budget
  if (pct >= alertPct) return "#C0613A";     // Muted terracotta — approaching limit
  return COLORS.ink;                         // Ink black — healthy
}

// ── Bar label ─────────────────────────────────────────────────────────────────
function getStatusLabel(pct: number, isExceeded: boolean, remaining: number, cur: string): string {
  if (isExceeded) {
    return `${formatCurrency(Math.abs(remaining), cur)} over limit`;
  }
  if (remaining <= 0) return "Limit reached";
  return `${formatCurrency(remaining, cur)} remaining`;
}

// ── Main component ────────────────────────────────────────────────────────────
interface BudgetProgressProps {
  budget:          EnrichedBudget;
  currencySymbol:  string;
  style?:          ViewStyle;
}

export const BudgetProgress = memo(function BudgetProgress({
  budget,
  currencySymbol,
  style,
}: BudgetProgressProps) {
  const {
    category_name, category_icon, category_color,
    limit_cents, spent_cents, remaining_cents,
    percent_used, is_exceeded, alert_triggered, alert_at_percent,
  } = budget;

  // Clamp to [0, 100] for the visual bar — over-budget still shows full bar
  const clampedPct = Math.min(percent_used, 100);
  const barColor   = getBarColor(percent_used, is_exceeded, alert_at_percent);

  // ── Animated bar fill ──────────────────────────────────────────────────────
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue:         clampedPct,
      useNativeDriver: false,   // width % can't use native driver
      damping:         22,
      stiffness:       160,
      mass:            0.9,
    }).start();
  }, [clampedPct]);

  const barWidth = fillAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ["0%", "100%"],
  });

  const isOverall     = !category_id;
  const displayName   = category_name ?? "Overall Budget";
  const displayIcon   = category_icon ?? "◈";
  const iconBg        = category_color ? category_color + "18" : COLORS.bgCard;

  const statusLabel = getStatusLabel(percent_used, is_exceeded, remaining_cents, currencySymbol);

  return (
    <View style={[styles.card, style]}>
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.leftRow}>
          <View style={[styles.iconPill, { backgroundColor: iconBg }]}>
            <Text style={styles.iconGlyph}>{displayIcon}</Text>
          </View>
          <View style={styles.nameMeta}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.periodLabel}>
              {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
            </Text>
          </View>
        </View>

        {/* Percentage badge */}
        <View style={[
          styles.pctBadge,
          is_exceeded    && styles.pctBadgeExceeded,
          alert_triggered && !is_exceeded && styles.pctBadgeWarning,
        ]}>
          <Text style={[
            styles.pctText,
            is_exceeded    && styles.pctTextExceeded,
            alert_triggered && !is_exceeded && styles.pctTextWarning,
          ]}>
            {percent_used}%
          </Text>
        </View>
      </View>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { width: barWidth, backgroundColor: barColor },
          ]}
        />
        {/* Alert threshold marker */}
        {alert_at_percent < 100 && (
          <View
            style={[
              styles.thresholdMarker,
              { left: `${alert_at_percent}%` as any },
            ]}
          />
        )}
      </View>

      {/* ── Amounts row ──────────────────────────────────────────────────── */}
      <View style={styles.amountsRow}>
        <Text style={[styles.statusLabel, is_exceeded && styles.statusLabelExceeded]}>
          {statusLabel}
        </Text>
        <Text style={styles.limitLabel}>
          of {formatCurrency(limit_cents, currencySymbol)}
        </Text>
      </View>
    </View>
  );
});

// Destructure for internal use in getStatusLabel
const { category_id } = { category_id: null }; // placeholder — actual value comes from budget prop

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    paddingVertical:   SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor:   COLORS.bg,
  },

  // Header
  headerRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   SPACE.md,
    gap:            SPACE.sm,
  },
  leftRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           SPACE.sm,
    flex:          1,
  },
  iconPill: {
    width:          34,
    height:         34,
    borderRadius:   RADIUS.md,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  iconGlyph: {
    fontSize: 16,
  },
  nameMeta: {
    flex: 1,
    gap:  2,
  },
  categoryName: {
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.base,
    color:      COLORS.ink,
  },
  periodLabel: {
    fontFamily:    FONTS.bodyRegular,
    fontSize:      FONT_SIZE.xs,
    color:         COLORS.inkMuted,
    letterSpacing: 0.3,
  },

  // Percentage badge
  pctBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical:   3,
    borderRadius:      RADIUS.sm,
    backgroundColor:   COLORS.bgCard,
    borderWidth:       1,
    borderColor:       COLORS.rule,
    flexShrink:        0,
  },
  pctBadgeWarning: {
    backgroundColor: "#C0613A18",
    borderColor:     "#C0613A55",
  },
  pctBadgeExceeded: {
    backgroundColor: "#A0352A18",
    borderColor:     "#A0352A55",
  },
  pctText: {
    fontFamily:    FONTS.bodySemiBold,
    fontSize:      FONT_SIZE.xs,
    color:         COLORS.inkMid,
    letterSpacing: 0.5,
  },
  pctTextWarning:  { color: "#C0613A" },
  pctTextExceeded: { color: "#A0352A" },

  // Bar track
  track: {
    height:          6,
    backgroundColor: COLORS.bgCard,
    borderRadius:    RADIUS.full,
    overflow:        "hidden",
    position:        "relative",
    marginBottom:    SPACE.sm,
  },
  fill: {
    height:       "100%",
    borderRadius: RADIUS.full,
  },
  // Thin vertical tick mark at the alert threshold
  thresholdMarker: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           1.5,
    backgroundColor: COLORS.bg,
    opacity:         0.5,
  },

  // Amounts
  amountsRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "baseline",
  },
  statusLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMid,
  },
  statusLabelExceeded: {
    color:      "#A0352A",
    fontFamily: FONTS.bodyMedium,
  },
  limitLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMuted,
  },
});
