// src/hooks/useExportCsv.ts
// =============================================================================
// Custom hook that orchestrates the full CSV export pipeline:
//   generateTransactionCsv() → shareCsvFile()
//
// Exposes:
//   exportCsv(options?)   — call this from the Settings button
//   isExporting           — true while the operation is in-flight
//   exportProgress        — 0-1 float for a progress indicator (optional UI use)
//   error                 — last error message, or null
//
// The hook is intentionally separate from the utility functions so:
//   - The utilities remain pure and testable without React
//   - The hook handles the React-specific state lifecycle
//   - Any screen can import this hook without coupling to a specific component
// =============================================================================

import { useState, useCallback } from "react";
import { Alert }                  from "react-native";
import { generateTransactionCsv, type CsvExportOptions } from "../utils/exportCsv";
import { shareCsvFile }           from "../utils/shareSheet";
import { useAuthStore }           from "../store/auth.store";

interface UseExportCsvReturn {
  exportCsv:      (options?: CsvExportOptions) => Promise<void>;
  isExporting:    boolean;
  exportProgress: number;
  error:          string | null;
}

export function useExportCsv(): UseExportCsvReturn {
  const [isExporting,    setIsExporting]    = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error,          setError]          = useState<string | null>(null);

  const currencyCode = useAuthStore((s) => s.user?.currency_code ?? "USD");

  const exportCsv = useCallback(async (options: CsvExportOptions = {}) => {
    if (isExporting) return;   // Prevent double-tap

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      // ── Step 1: Generate CSV ───────────────────────────────────────────────
      const result = await generateTransactionCsv({
        currencyCode,
        onProgress: setExportProgress,
        ...options,
      });

      if (result.rowCount === 0) {
        Alert.alert(
          "Nothing to Export",
          options.month
            ? "No transactions found for the selected month."
            : "You have no transactions to export yet. Log some expenses first."
        );
        return;
      }

      // ── Step 2: Share via native sheet ─────────────────────────────────────
      await shareCsvFile({
        csvContent: result.csv,
        filename:   result.filename,
      });

      setExportProgress(1);

    } catch (err: any) {
      const message = err?.message ?? "Export failed. Please try again.";
      setError(message);

      Alert.alert("Export Failed", message, [{ text: "OK" }]);
    } finally {
      setIsExporting(false);
      // Reset progress after a short delay so any progress UI fades gracefully
      setTimeout(() => setExportProgress(0), 600);
    }
  }, [isExporting, currencyCode]);

  return { exportCsv, isExporting, exportProgress, error };
}
