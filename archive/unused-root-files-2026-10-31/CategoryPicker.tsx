// src/components/CategoryPicker.tsx
// =============================================================================
// Category picker implemented as a native bottom sheet.
//
// Design: Editorial minimalism — the sheet rises with a clean white surface,
// categories are set in heavy ink type on hairline-ruled rows, and the
// selected state is a single left-edge bar rather than a filled background.
//
// Architecture:
//   Uses React Native's built-in Animated + Modal instead of @gorhom/bottom-sheet
//   to keep the dependency footprint small for this sprint. Can be swapped for
//   a proper bottom sheet library once the app is more mature.
//
// Data:
//   Hardcoded for now — easily replaced with a useQuery("/categories") call
//   once the backend category sync is wired. The structure matches what the
//   backend returns so the swap is a one-line change.
// =============================================================================

import React, { useEffect, useRef, useCallback } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";

// ── Static category data ──────────────────────────────────────────────────────
// Matches the backend Category shape — swap for API data when ready.
export interface Category {
  id:    string;
  name:  string;
  icon:  string;
  color: string;
  type:  "expense" | "income" | "both";
}

export const DEFAULT_CATEGORIES: Category[] = [
  // ── Expense categories ──────────────────────────────────────────────────
  {
    id:    "cat-streetwear",
    name:  "Streetwear & Fashion",
    icon:  "👕",
    color: "#2C2C2C",
    type:  "expense",
  },
  {
    id:    "cat-fragrance",
    name:  "High-End Fragrances",
    icon:  "🫧",
    color: "#7A6652",
    type:  "expense",
  },
  {
    id:    "cat-skincare",
    name:  "Skincare & Grooming",
    icon:  "🧴",
    color: "#5C7A6E",
    type:  "expense",
  },
  {
    id:    "cat-nutrition",
    name:  "Nutrition & Supplements",
    icon:  "💊",
    color: "#7A5C5C",
    type:  "expense",
  },
  {
    id:    "cat-education",
    name:  "University & Trade Prep",
    icon:  "📚",
    color: "#4A5C7A",
    type:  "expense",
  },
  {
    id:    "cat-food",
    name:  "Food & Dining",
    icon:  "🍽️",
    color: "#8A6A3A",
    type:  "expense",
  },
  {
    id:    "cat-transport",
    name:  "Transport",
    icon:  "🚗",
    color: "#3A6A7A",
    type:  "expense",
  },
  // ── Income categories ───────────────────────────────────────────────────
  {
    id:    "cat-income-main",
    name:  "Main Income",
    icon:  "💼",
    color: "#2D6A4F",
    type:  "income",
  },
  {
    id:    "cat-transfers",
    name:  "Transfers",
    icon:  "⇄",
    color: "#5C5950",
    type:  "income",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryPickerProps {
  visible:           boolean;
  selectedId:        string | null;
  transactionType:   "expense" | "income";
  onSelect:          (category: Category) => void;
  onClose:           () => void;
}

// ── Sheet animation constants ─────────────────────────────────────────────────
const SHEET_HEIGHT = 480;

// ── Category row ──────────────────────────────────────────────────────────────
function CategoryRow({
  item,
  isSelected,
  onPress,
}: {
  item:       Category;
  isSelected: boolean;
  onPress:    () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed     && styles.rowPressed,
        isSelected  && styles.rowSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.name}
    >
      {/* Selected state: left edge bar */}
      {isSelected && <View style={styles.selectedBar} />}

      {/* Icon pill */}
      <View style={[styles.iconPill, { backgroundColor: item.color + "22" }]}>
        <Text style={styles.iconGlyph}>{item.icon}</Text>
      </View>

      {/* Name */}
      <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>
        {item.name}
      </Text>

      {/* Checkmark */}
      {isSelected && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </Pressable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CategoryPicker({
  visible,
  selectedId,
  transactionType,
  onSelect,
  onClose,
}: CategoryPickerProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Filter categories by current transaction type (show "both" always)
  const categories = DEFAULT_CATEGORIES.filter(
    (c) => c.type === transactionType || c.type === "both"
  );

  // ── Open/close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue:         0,
          useNativeDriver: true,
          damping:         28,
          stiffness:       300,
          mass:            0.8,
        }),
        Animated.timing(backdropOpacity, {
          toValue:         1,
          duration:        220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:         SHEET_HEIGHT,
          duration:        240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue:         0,
          duration:        200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = useCallback((category: Category) => {
    onSelect(category);
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            Select Category
          </Text>
          <Text style={styles.sheetSubtitle}>
            {transactionType === "expense" ? "Where did it go?" : "Where did it come from?"}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Category list */}
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryRow
              item={item}
              isSelected={item.id === selectedId}
              onPress={() => handleSelect(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,16,0.55)",
  },
  sheet: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    height:          SHEET_HEIGHT,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius:  RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    // Crisp top border
    borderTopWidth:  1.5,
    borderTopColor:  COLORS.ink,
  },
  handle: {
    width:           40,
    height:          3,
    borderRadius:    RADIUS.full,
    backgroundColor: COLORS.rule,
    alignSelf:       "center",
    marginTop:       SPACE.md,
    marginBottom:    SPACE.sm,
  },
  sheetHeader: {
    paddingHorizontal: SPACE.lg,
    paddingBottom:     SPACE.md,
  },
  sheetTitle: {
    fontFamily: FONTS.displayBold,
    fontSize:   FONT_SIZE.xl,
    color:      COLORS.ink,
    lineHeight: FONT_SIZE.xl * 1.2,
  },
  sheetSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMuted,
    marginTop:  3,
  },
  divider: {
    height:     1,
    backgroundColor: COLORS.rule,
    marginHorizontal: SPACE.lg,
  },
  listContent: {
    paddingHorizontal: SPACE.lg,
    paddingTop:        SPACE.sm,
    paddingBottom:     SPACE.xl,
  },
  separator: {
    height:          1,
    backgroundColor: COLORS.rule,
    opacity:         0.5,
  },
  row: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingVertical: SPACE.md,
    gap:             SPACE.md,
    position:        "relative",
    paddingLeft:     SPACE.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowSelected: {
    // Subtle warm tint when selected
  },
  selectedBar: {
    position:        "absolute",
    left:            0,
    top:             8,
    bottom:          8,
    width:           2.5,
    backgroundColor: COLORS.sand,
    borderRadius:    RADIUS.full,
  },
  iconPill: {
    width:          36,
    height:         36,
    borderRadius:   RADIUS.md,
    alignItems:     "center",
    justifyContent: "center",
  },
  iconGlyph: {
    fontSize: 17,
  },
  rowName: {
    flex:       1,
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.base,
    color:      COLORS.inkMid,
  },
  rowNameSelected: {
    fontFamily: FONTS.bodySemiBold,
    color:      COLORS.ink,
  },
  checkmark: {
    fontFamily: FONTS.bodySemiBold,
    fontSize:   FONT_SIZE.base,
    color:      COLORS.sand,
  },
});
