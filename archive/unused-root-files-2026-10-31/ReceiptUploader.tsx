// src/components/ReceiptUploader.tsx
// =============================================================================
// Receipt attachment component for the Transaction Detail screen.
//
// Two states:
//   EMPTY  — Dashed-border drop-zone with camera + library action buttons
//   FILLED — Borderless thumbnail that opens a full-screen viewer on tap
//
// Design:
//   Empty state: parchment-toned dashed border, sparse italic placeholder text.
//   Filled state: full-bleed image with a paper-cut corner badge for remove action.
//   Full-screen viewer: ink-black background, image centred with pinch-to-zoom
//   (via ScrollView), subtle close button top-right.
//
// Permissions:
//   expo-image-picker requires camera + media library permissions.
//   We request them lazily on first use (when the user taps a button)
//   rather than on mount — better UX, avoids the permission dialog
//   appearing before the user has even indicated intent.
//
// Upload flow:
//   1. User picks image → local URI available immediately
//   2. onPickImage(uri, mimeType) callback fires → parent calls uploadReceipt()
//   3. Parent updates React Query cache → receipt_image_url becomes the CDN URL
//   This component is purely presentational — upload logic lives in the screen.
// =============================================================================

import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { COLORS, FONTS, FONT_SIZE, SPACE, RADIUS } from "../constants/theme";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptUploaderProps {
  /** CDN URL of an existing receipt, or null if none attached */
  receiptUrl:    string | null;
  /** Called when the user picks an image — parent handles the actual upload */
  onPickImage:   (localUri: string, mimeType: string) => void;
  /** Called when the user confirms they want to remove the receipt */
  onRemove:      () => void;
  /** True while the parent's upload mutation is in-flight */
  isUploading?:  boolean;
  disabled?:     boolean;
}

// ── Permission helpers ────────────────────────────────────────────────────────

async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Access Required",
      "Please enable camera access in your device settings to snap a receipt photo.",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
}

async function requestMediaPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo Library Access Required",
      "Please enable photo library access in your device settings to upload a receipt.",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
}

// ── Image compression helper ──────────────────────────────────────────────────

/**
 * Compresses and resizes the picked image before upload.
 * Receipts don't need to be massive — 1200px wide at 80% quality is sufficient
 * and keeps upload times fast on mobile networks.
 */
async function compressImage(uri: string): Promise<{ uri: string; mimeType: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.8,
      format:   ImageManipulator.SaveFormat.JPEG,
    }
  );
  return { uri: result.uri, mimeType: "image/jpeg" };
}

// ── Full-screen image viewer ──────────────────────────────────────────────────

function FullScreenViewer({
  uri,
  visible,
  onClose,
}: {
  uri:     string;
  visible: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={viewerStyles.screen}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={viewerStyles.closeBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close receipt"
        >
          <Text style={viewerStyles.closeBtnText}>✕</Text>
        </Pressable>

        {/* Zoomable image via ScrollView maximumZoomScale */}
        <ScrollView
          contentContainerStyle={viewerStyles.imageContainer}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bouncesZoom
          centerContent
        >
          <Image
            source={{ uri }}
            style={{ width, height: height * 0.88 }}
            resizeMode="contain"
            accessibilityLabel="Receipt image"
          />
        </ScrollView>

        {/* Bottom label */}
        <View style={viewerStyles.bottomBar}>
          <Text style={viewerStyles.bottomLabel}>Pinch to zoom · Tap ✕ to close</Text>
        </View>
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: "#0C0C0F",
  },
  closeBtn: {
    position:        "absolute",
    top:             52,
    right:           SPACE.lg,
    zIndex:          10,
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  closeBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.sm,
    color:      "#F0EEF8",
  },
  imageContainer: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  bottomBar: {
    paddingBottom: 40,
    paddingTop:    SPACE.sm,
    alignItems:    "center",
  },
  bottomLabel: {
    fontFamily:    FONTS.bodyRegular,
    fontSize:      FONT_SIZE.xs,
    color:         "#555566",
    letterSpacing: 0.5,
  },
});

// ── Main component ────────────────────────────────────────────────────────────

export function ReceiptUploader({
  receiptUrl,
  onPickImage,
  onRemove,
  isUploading = false,
  disabled    = false,
}: ReceiptUploaderProps) {
  const [viewerVisible, setViewerVisible] = useState(false);

  // ── Pick from camera ───────────────────────────────────────────────────────
  const handleCamera = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:        ImagePicker.MediaTypeOptions.Images,
      allowsEditing:     true,
      quality:           1,     // We compress ourselves below
    });

    if (!result.canceled && result.assets[0]) {
      const { uri, mimeType } = result.assets[0];
      const compressed = await compressImage(uri);
      onPickImage(compressed.uri, compressed.mimeType);
    }
  }, [onPickImage]);

  // ── Pick from gallery ──────────────────────────────────────────────────────
  const handleGallery = useCallback(async () => {
    const granted = await requestMediaPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality:       1,
    });

    if (!result.canceled && result.assets[0]) {
      const { uri } = result.assets[0];
      const compressed = await compressImage(uri);
      onPickImage(compressed.uri, compressed.mimeType);
    }
  }, [onPickImage]);

  // ── Show action sheet ──────────────────────────────────────────────────────
  const handleAddReceipt = useCallback(() => {
    Alert.alert(
      "Attach Receipt",
      "Choose a source",
      [
        { text: "Take Photo",        onPress: handleCamera  },
        { text: "Choose from Library", onPress: handleGallery },
        { text: "Cancel",            style: "cancel"        },
      ]
    );
  }, [handleCamera, handleGallery]);

  // ── Confirm remove ─────────────────────────────────────────────────────────
  const handleRemove = useCallback(() => {
    Alert.alert(
      "Remove Receipt",
      "Are you sure you want to remove this receipt?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onRemove },
      ]
    );
  }, [onRemove]);

  // ── FILLED STATE: receipt exists ───────────────────────────────────────────
  if (receiptUrl) {
    return (
      <>
        <View style={filledStyles.container}>
          {/* Section label */}
          <Text style={filledStyles.sectionLabel}>RECEIPT</Text>

          {/* Thumbnail — tapping opens full-screen viewer */}
          <Pressable
            onPress={() => setViewerVisible(true)}
            style={({ pressed }) => [
              filledStyles.thumbnailWrap,
              pressed && { opacity: 0.88 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View receipt"
            disabled={disabled}
          >
            <Image
              source={{ uri: receiptUrl }}
              style={filledStyles.thumbnail}
              resizeMode="cover"
            />

            {/* "View" label overlay */}
            <View style={filledStyles.viewOverlay}>
              <Text style={filledStyles.viewLabel}>Tap to view</Text>
            </View>
          </Pressable>

          {/* Actions: replace + remove */}
          <View style={filledStyles.actions}>
            <Pressable
              onPress={handleAddReceipt}
              disabled={disabled || isUploading}
              style={({ pressed }) => [filledStyles.actionBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={filledStyles.actionText}>Replace</Text>
            </Pressable>
            <View style={filledStyles.actionDivider} />
            <Pressable
              onPress={handleRemove}
              disabled={disabled || isUploading}
              style={({ pressed }) => [filledStyles.actionBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={[filledStyles.actionText, filledStyles.actionTextRemove]}>Remove</Text>
            </Pressable>
          </View>
        </View>

        {/* Full-screen viewer modal */}
        <FullScreenViewer
          uri={receiptUrl}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      </>
    );
  }

  // ── EMPTY STATE: no receipt ────────────────────────────────────────────────
  return (
    <Pressable
      onPress={handleAddReceipt}
      disabled={disabled || isUploading}
      style={({ pressed }) => [
        emptyStyles.dropZone,
        pressed && emptyStyles.dropZonePressed,
        disabled && emptyStyles.dropZoneDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Attach receipt"
    >
      {isUploading ? (
        <View style={emptyStyles.uploadingState}>
          <ActivityIndicator size="small" color={COLORS.inkMuted} />
          <Text style={emptyStyles.uploadingText}>Uploading…</Text>
        </View>
      ) : (
        <>
          {/* Camera glyph */}
          <Text style={emptyStyles.cameraGlyph}>⬡</Text>

          {/* Prompt text */}
          <Text style={emptyStyles.promptTitle}>Attach Receipt</Text>
          <Text style={emptyStyles.promptBody}>
            For those beige oversize trousers,{"\n"}
            the new wash-off gel, or a fragrance invoice.
          </Text>

          {/* Action hints */}
          <View style={emptyStyles.hintRow}>
            <View style={emptyStyles.hintPill}>
              <Text style={emptyStyles.hintText}>📷 Camera</Text>
            </View>
            <View style={emptyStyles.hintPill}>
              <Text style={emptyStyles.hintText}>🖼 Library</Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

// ── Filled state styles ───────────────────────────────────────────────────────
const filledStyles = StyleSheet.create({
  container: {
    gap: SPACE.sm,
  },
  sectionLabel: {
    fontFamily:    FONTS.bodyMedium,
    fontSize:      FONT_SIZE.xs,
    color:         COLORS.inkMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  thumbnailWrap: {
    position:     "relative",
    borderRadius: RADIUS.lg,
    overflow:     "hidden",
    // Aspect ratio 3:2 — standard receipt proportions
    aspectRatio:  3 / 2,
  },
  thumbnail: {
    width:  "100%",
    height: "100%",
  },
  viewOverlay: {
    position:       "absolute",
    bottom:         0,
    left:           0,
    right:          0,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    backgroundColor: "rgba(17,17,16,0.55)",
    alignItems:     "center",
  },
  viewLabel: {
    fontFamily:    FONTS.bodyMedium,
    fontSize:      FONT_SIZE.xs,
    color:         "rgba(247,244,238,0.85)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  actions: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: SPACE.xs,
  },
  actionBtn: {
    paddingHorizontal: SPACE.lg,
    paddingVertical:   SPACE.sm,
  },
  actionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMid,
  },
  actionTextRemove: {
    color: COLORS.negative,
  },
  actionDivider: {
    width:           1,
    height:          14,
    backgroundColor: COLORS.rule,
  },
});

// ── Empty state styles ────────────────────────────────────────────────────────
const emptyStyles = StyleSheet.create({
  dropZone: {
    borderWidth:     1.5,
    borderColor:     COLORS.rule,
    borderStyle:     "dashed",
    borderRadius:    RADIUS.lg,
    padding:         SPACE.xl,
    alignItems:      "center",
    gap:             SPACE.sm,
    backgroundColor: COLORS.bgCard,
  },
  dropZonePressed: {
    backgroundColor: COLORS.bgSkeletonA,
    borderColor:     COLORS.inkMuted,
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },

  cameraGlyph: {
    fontSize:     32,
    color:        COLORS.rule,
    lineHeight:   40,
    marginBottom: SPACE.xs,
  },
  promptTitle: {
    fontFamily:    FONTS.bodySemiBold,
    fontSize:      FONT_SIZE.base,
    color:         COLORS.inkMid,
    letterSpacing: 0.3,
  },
  promptBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize:   FONT_SIZE.sm,
    color:      COLORS.inkMuted,
    textAlign:  "center",
    lineHeight: FONT_SIZE.sm * 1.65,
    fontStyle:  "italic",
  },
  hintRow: {
    flexDirection:  "row",
    gap:            SPACE.sm,
    marginTop:      SPACE.xs,
  },
  hintPill: {
    backgroundColor:  COLORS.bg,
    borderWidth:      1,
    borderColor:      COLORS.rule,
    borderRadius:     RADIUS.full,
    paddingHorizontal: SPACE.md,
    paddingVertical:  5,
  },
  hintText: {
    fontFamily:    FONTS.bodyMedium,
    fontSize:      FONT_SIZE.xs,
    color:         COLORS.inkMuted,
    letterSpacing: 0.3,
  },

  uploadingState: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  uploadingText: {
    fontFamily:    FONTS.bodyRegular,
    fontSize:      FONT_SIZE.sm,
    color:         COLORS.inkMuted,
    letterSpacing: 0.3,
  },
});
