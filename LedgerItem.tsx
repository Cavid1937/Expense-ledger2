// src/components/LedgerItem.tsx
// =============================================================================
// Ledger list components — updated with swipe-to-delete.
//
// Swipe implementation:
//   Uses react-native-reanimated v3 + react-native-gesture-handler v2
//   GestureDetector directly — not the RNGH Swipeable wrapper.
//
//   Why not use RNGH's Swipeable?
//   FlashList recycles cells. RNGH's Swipeable keeps internal ref-based
//   open/close state that doesn't reset when the cell is assigned new data.
//   This causes "ghost swipe" bugs: a previously-open row's swipe panel
//   appears on an unrelated item after recycling.
//
//   Our implementation stores all state in Reanimated useSharedValue which
//   is reset in a useEffect whenever transaction.id changes — the correct
//   lifecycle hook for FlashList recycled cells.
//
// Swipe UX:
//   - Drag left: delete panel (#C0613A terracotta) reveals progressively
//   - < 60px: springs back closed on release
//   - ≥ 60px: snaps open to full panel width (88px)
//   - Panel tap: fires Alert.alert confirmation → DELETE mutation
//   - Tap on closed row: navigates to detail screen
//   - Tap on open row: springs closed
//
// Delete confirmation:
//   Uses the shared confirmAndDeleteTransaction() utility — identical Alert
//   copy and cache invalidation as the Detail screen's delete button.
// =============================================================================

import React, { memo, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useQueryClient }   from "react-query";

import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";
import { formatCurrency }                          from "../utils/currency";
import { confirmAndDeleteTransaction }             from "../utils/transactionDelete";
import type { DateHeader }                         from "../utils/grouping";
import type { Transaction }                        from "../api/transactions.api";

// ── Constants ─────────────────────────────────────────────────────────────────
const PANEL_W     = 88;
const THRESHOLD   = 60;
const TERRACOTTA  = "#C0613A";

// ── Date section header ───────────────────────────────────────────────────────
interface LedgerDateHeaderProps {
  item:           DateHeader;
  currencySymbol: string;
}

export const LedgerDateHeader = memo(function LedgerDateHeader({
  item,
  currencySymbol,
}: LedgerDateHeaderProps) {
  const abs    = Math.abs(item.totalCents);
  const sign   = item.totalCents < 0 ? "−" : item.totalCents > 0 ? "+" : "";
  const color  = item.totalCents < 0 ? COLORS.negative : item.totalCents > 0 ? COLORS.positive : COLORS.inkMuted;
  const total  = abs > 0 ? `${sign}${formatCurrency(abs, currencySymbol)}` : null;

  return (
    <View style={hdrStyles.container}>
      <View style={hdrStyles.row}>
        <Text style={[hdrStyles.label, item.label === "Today" && hdrStyles.today]}>
          {item.label}
        </Text>
        {total && <Text style={[hdrStyles.total, { color }]}>{total}</Text>}
      </View>
      <View style={hdrStyles.rule} />
    </View>
  );
});

const hdrStyles = StyleSheet.create({
  container: { paddingTop: SPACE.lg, paddingBottom: SPACE.xs, paddingHorizontal: SPACE.lg, backgroundColor: COLORS.bg },
  row:       { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: SPACE.xs },
  label:     { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZE.xs, color: COLORS.inkMuted, letterSpacing: 2, textTransform: "uppercase" },
  today:     { color: COLORS.ink, fontFamily: FONTS.bodySemiBold },
  total:     { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZE.xs, letterSpacing: 0.5 },
  rule:      { height: 1, backgroundColor: COLORS.rule },
});

// ── LedgerItem with swipe-to-delete ──────────────────────────────────────────
interface LedgerItemProps {
  transaction:    Transaction;
  currencySymbol: string;
  onPress?:       (t: Transaction) => void;
}

export const LedgerItem = memo(function LedgerItem({
  transaction,
  currencySymbol,
  onPress,
}: LedgerItemProps) {
  const queryClient = useQueryClient();
  const { type, amount_cents, category_name, category_icon, category_color, note } = transaction;

  const isExpense  = type === "expense";
  const isIncome   = type === "income";
  const sign       = isExpense ? "−" : isIncome ? "+" : "⇄";
  const amountStr  = formatCurrency(amount_cents, currencySymbol);
  const amtColor   = isExpense ? COLORS.ink : isIncome ? COLORS.sand : COLORS.inkMuted;
  const signColor  = isExpense ? COLORS.inkMuted : amtColor;
  const iconBg     = category_color ? category_color + "18" : COLORS.bgCard;

  // ── Shared values ──────────────────────────────────────────────────────────
  const tx         = useSharedValue(0);
  const rowH       = useSharedValue(-1);   // -1 = unmeasured / normal flow

  // Reset on cell recycle (FlashList assigns new transaction data to old cells)
  useEffect(() => {
    tx.value    = withSpring(0, { damping: 25, stiffness: 250 });
    rowH.value  = -1;
  }, [transaction.id]);

  // ── Animated styles ────────────────────────────────────────────────────────
  const rowStyle = useAnimatedStyle(() => {
    const base: object = { transform: [{ translateX: tx.value }] };
    if (rowH.value >= 0) {
      return { ...base, height: rowH.value, overflow: "hidden" as const,
        opacity: interpolate(rowH.value, [0, 48], [0, 1], Extrapolation.CLAMP) };
    }
    return base;
  });

  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-tx.value, [0, PANEL_W * 0.4, PANEL_W], [0, 0.4, 1], Extrapolation.CLAMP),
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-tx.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Delete flow ────────────────────────────────────────────────────────────
  const runDelete = useCallback(async () => {
    await confirmAndDeleteTransaction(transaction.id, queryClient, false);
    // If cancelled, snap back (the utility resolves false and we can't easily
    // detect it here since we're called from JS — so we always snap back;
    // the cache invalidation handles the row disappearing if actually deleted)
    tx.value = withSpring(0, { damping: 22, stiffness: 250 });
  }, [transaction.id, queryClient]);

  const handlePanelPress = useCallback(() => {
    runDelete();
  }, [runDelete]);

  // ── Gestures ───────────────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-6, 6])
    .onUpdate((e) => {
      tx.value = Math.min(0, Math.max(-PANEL_W, e.translationX));
    })
    .onEnd(() => {
      if (-tx.value >= THRESHOLD) {
        tx.value = withSpring(-PANEL_W, { damping: 20, stiffness: 220, mass: 0.8 });
      } else {
        tx.value = withSpring(0, { damping: 22, stiffness: 250 });
      }
    });

  const tap = Gesture.Tap()
    .onEnd(() => {
      if (tx.value < -8) {
        // Panel open — close it
        tx.value = withSpring(0, { damping: 22, stiffness: 250 });
      } else if (onPress) {
        runOnJS(onPress)(transaction);
      }
    });

  const composed = Gesture.Simultaneous(pan, tap);

  return (
    <View style={styles.container}>
      {/* Delete panel — positioned behind the row */}
      <Animated.View style={[styles.panel, panelStyle]}>
        <Pressable style={styles.panelInner} onPress={handlePanelPress}
          accessibilityRole="button" accessibilityLabel="Delete transaction">
          <Text style={styles.panelGlyph}>⊗</Text>
          <Text style={styles.panelLabel}>Delete</Text>
        </Pressable>
      </Animated.View>

      {/* Swipeable row */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.row, rowStyle]}>
          {/* Left swipe hint bar */}
          <Animated.View style={[styles.swipeHint, hintStyle]} />

          <View style={[styles.iconPill, { backgroundColor: iconBg }]}>
            <Text style={styles.iconGlyph}>{category_icon ?? "·"}</Text>
          </View>

          <View style={styles.meta}>
            <Text style={styles.catName} numberOfLines={1}>{category_name ?? "Uncategorised"}</Text>
            {note?.trim() && (
              <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">{note}</Text>
            )}
          </View>

          <View style={styles.amtBlock}>
            <View style={styles.amtRow}>
              <Text style={[styles.sign, { color: signColor }]}>{sign}</Text>
              <Text style={[styles.amount, { color: amtColor }]}>{amountStr}</Text>
            </View>
            {type === "transfer" && <Text style={styles.transferTag}>transfer</Text>}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { position: "relative", backgroundColor: COLORS.bg, overflow: "hidden" },

  panel: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: PANEL_W, backgroundColor: TERRACOTTA,
  },
  panelInner: {
    flex: 1, width: "100%", alignItems: "center",
    justifyContent: "center", gap: 4,
  },
  panelGlyph: { fontSize: 20, color: "#FDEEE8", lineHeight: 24 },
  panelLabel: {
    fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZE.xs,
    color: "#FDEEE8", letterSpacing: 1, textTransform: "uppercase",
  },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg,
    backgroundColor: COLORS.bg, gap: SPACE.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.rule,
  },
  swipeHint: {
    position: "absolute", left: 0, top: 12, bottom: 12,
    width: 2.5, backgroundColor: TERRACOTTA, borderRadius: RADIUS.full,
  },

  iconPill: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  iconGlyph: { fontSize: 18 },

  meta:    { flex: 1, gap: 3 },
  catName: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZE.base, color: COLORS.ink, lineHeight: FONT_SIZE.base * 1.3 },
  note:    { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZE.sm, color: COLORS.inkMuted, lineHeight: FONT_SIZE.sm * 1.4 },

  amtBlock:    { alignItems: "flex-end", flexShrink: 0 },
  amtRow:      { flexDirection: "row", alignItems: "baseline", gap: 1 },
  sign:        { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.base * 1.3 },
  amount:      { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZE.base, letterSpacing: 0.2, lineHeight: FONT_SIZE.base * 1.3 },
  transferTag: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZE.xs, color: COLORS.inkMuted, letterSpacing: 0.5, marginTop: 2 },
});
