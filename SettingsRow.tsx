// src/components/SettingsRow.tsx
// =============================================================================
// Reusable settings row component.
//
// Design:
//   Content-first. No card backgrounds, no shadows. Just type, a hairline
//   rule, and a minimal chevron. The entire interaction weight lives in
//   the opacity fade on press.
//
// Variants:
//   default     — title + optional subtitle + chevron
//   destructive — title in a deep editorial red (for "Log Out" etc.)
//   disclosure  — has a chevron (navigates somewhere)
//   action      — no chevron (triggers an action in-place)
//   value       — displays a right-side value string instead of a chevron
// =============================================================================

import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SettingsRowVariant = "default" | "destructive" | "action" | "value";

interface SettingsRowProps {
  title:       string;
  subtitle?:   string;
  /** Right-side value string — shown instead of chevron when variant="value" */
  value?:      string;
  variant?:    SettingsRowVariant;
  /** Whether to show the › chevron indicator */
  showChevron?: boolean;
  /** Left-side icon glyph (emoji or symbol) */
  icon?:       string;
  iconColor?:  string;
  onPress?:    () => void;
  disabled?:   boolean;
  style?:      ViewStyle;
  /** Show a hairline bottom border (default: true) */
  showBorder?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const SettingsRow = memo(function SettingsRow({
  title,
  subtitle,
  value,
  variant      = "default",
  showChevron  = variant === "default",
  icon,
  iconColor,
  onPress,
  disabled     = false,
  style,
  showBorder   = true,
}: SettingsRowProps) {
  const isDestructive = variant === "destructive";

  const titleColor = isDestructive ? COLORS.negative : COLORS.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        showBorder && styles.rowBorder,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
        style,
      ]}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      {/* ── Left icon ──────────────────────────────────────────────────── */}
      {icon && (
        <View style={[
          styles.iconWrap,
          iconColor && { backgroundColor: iconColor + "18" },
        ]}>
          <Text style={styles.iconGlyph}>{icon}</Text>
        </View>
      )}

      {/* ── Title + subtitle ────────────────────────────────────────────── */}
      <View style={styles.textBlock}>
        <Text
          style={[styles.title, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* ── Right side ──────────────────────────────────────────────────── */}
      {value && (
        <Text style={styles.valueText} numberOfLines={1}>
          {value}
        </Text>
      )}
      {showChevron && !value && (
        <Text style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
});

// ── Section wrapper ───────────────────────────────────────────────────────────
// Groups rows under a labelled section with consistent spacing.

interface SettingsSectionProps {
  title?:    string;
  children:  React.ReactNode;
  style?:    ViewStyle;
}

export function SettingsSection({ title, children, style }: SettingsSectionProps) {
  return (
    <View style={[sectionStyles.section, style]}>
      {title && (
        <Text style={sectionStyles.label}>{title.toUpperCase()}</Text>
      )}
      <View style={sectionStyles.content}>
        {children}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   SPACE.md,
    paddingHorizontal: SPACE.lg,
    backgroundColor:   COLORS.bg,
    gap:               SPACE.md,
    minHeight:         56,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  rowPressed: {
    opacity: 0.55,
  },
  rowDisabled: {
    opacity: 0.4,
  },

  iconWrap: {
    width:           36,
    height:          36,
    borderRadius:    RADIUS.md,
    backgroundColor: COLORS.bgCard,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  iconGlyph: {
    fontSize: 17,
  },

  textBlock: {
    flex: 1,
    gap:  3,
  },
  title: {
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.base,
    color:      COLORS.ink,
    lineHeight: FONT_SIZE.base * 1.3,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMuted,
    lineHeight: FONT_SIZE.sm * 1.5,
  },

  valueText: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.base,
    color:      COLORS.inkMuted,
    flexShrink: 0,
    maxWidth:   140,
    textAlign:  "right",
  },

  chevron: {
    fontFamily:    FONTS.bodyBold,
    fontSize:      FONT_SIZE.xl,
    color:         COLORS.rule,
    lineHeight:    FONT_SIZE.xl,
    flexShrink:    0,
  },
});

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: SPACE.lg,
  },
  label: {
    fontFamily:        FONTS.bodyMedium,
    fontSize:          FONT_SIZE.xs,
    color:             COLORS.inkMuted,
    letterSpacing:     2,
    textTransform:     "uppercase",
    paddingHorizontal: SPACE.lg,
    paddingBottom:     SPACE.sm,
    paddingTop:        SPACE.lg,
  },
  content: {
    borderTopWidth:    1,
    borderTopColor:    COLORS.rule,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor:   COLORS.bg,
  },
});
