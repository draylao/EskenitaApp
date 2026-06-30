import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Lock,
  MoonStar,
  Radio,
  TriangleAlert,
  User,
} from "lucide-react-native";

// ---- Design tokens — dark theme, matches the rest of the app ----
const palette = {
  overlay: "rgba(0, 0, 0, 0.55)",
  sheetBg: "#15171D",
  cardBg: "#1C1F26",
  cardBorder: "#2A2E37",
  selectedBorder: "#FF7A1A",
  selectedBg: "rgba(255, 122, 26, 0.10)",
  danger: "#FF4D4D",
  accent: "#FF7A1A",
  good: "#34D17A",
  textPrimary: "#F5F6F8",
  textSecondary: "#A7ACB5",
  textMuted: "#6E727B",
};

const CATEGORIES = [
  { id: "no_lighting", label: "No lighting", Icon: MoonStar },
  { id: "suspicious_person", label: "Suspicious person", Icon: User },
  { id: "street_blocked", label: "Street blocked", Icon: Lock },
  { id: "other", label: "Other", Icon: AlertTriangle },
];

const SEVERITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

/**
 * ThreatReportModal
 *
 * Pass `userLocation` ({ latitude, longitude }) and optionally `locationLabel`
 * (a human-readable area name, e.g. from reverse geocoding) so the report can
 * be auto-pinned to where the user is standing when they submit.
 *
 * onSubmit receives the full report object:
 * {
 *   category, severity, description, location, locationLabel, reportedAt
 * }
 * The parent is responsible for dropping a marker on the map at `location`
 * and wiring that marker's onPress to open a details view with this payload.
 */
const ThreatReportModal = ({
  visible,
  onClose,
  onSubmit,
  userLocation,
  locationLabel = "Current location",
}) => {
  const [category, setCategory] = useState(null);
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeLabel = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const canSubmit = !!category && !isSubmitting;

  const resetForm = () => {
    setCategory(null);
    setSeverity("medium");
    setDescription("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!category || isSubmitting) return;
    setIsSubmitting(true);

    const report = {
      category,
      severity,
      description: description.trim(),
      location: userLocation || null, // auto-attached, this is what pins the marker
      locationLabel,
      reportedAt: new Date().toISOString(),
    };

    try {
      await onSubmit(report);
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.headerRow}>
            <View style={styles.warnBadge}>
              <TriangleAlert size={18} color={palette.danger} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.header}>What's unsafe?</Text>
              <Text style={styles.subtext}>
                {timeLabel} · {locationLabel}
              </Text>
            </View>
          </View>

          {/* Category grid */}
          <View style={styles.grid}>
            {CATEGORIES.map(({ id, label, Icon }) => {
              const selected = category === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                  onPress={() => setCategory(id)}
                  activeOpacity={0.85}
                >
                  <Icon size={20} color={selected ? palette.accent : palette.textSecondary} />
                  <Text
                    style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details */}
          <TextInput
            style={styles.input}
            placeholder="Any details to help others?..."
            placeholderTextColor={palette.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          {/* Severity */}
          <Text style={styles.sectionLabel}>How severe?</Text>
          <View style={styles.severityRow}>
            {SEVERITIES.map(({ id, label }) => {
              const selected = severity === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.severityPill, selected && styles.severityPillSelected]}
                  onPress={() => setSeverity(id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.severityText, selected && styles.severityTextSelected]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <View style={styles.liveRow}>
              <Radio size={13} color={palette.accent} />
              <Text style={styles.liveText}>Shared in real-time</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#1A1100" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: palette.sheetBg,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  warnBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 77, 77, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  header: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  subtext: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  categoryCard: {
    width: "47.5%",
    backgroundColor: palette.cardBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: palette.cardBorder,
    gap: 8,
  },
  categoryCardSelected: {
    borderColor: palette.selectedBorder,
    backgroundColor: palette.selectedBg,
  },
  categoryLabel: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryLabelSelected: {
    color: palette.accent,
  },
  input: {
    backgroundColor: palette.cardBg,
    color: palette.textPrimary,
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    fontSize: 14,
  },
  sectionLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  severityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  severityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: palette.cardBg,
    borderWidth: 1.5,
    borderColor: palette.cardBorder,
  },
  severityPillSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.selectedBg,
  },
  severityText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  severityTextSelected: {
    color: palette.accent,
  },
  footerRow: {
    marginBottom: 16,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelText: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: palette.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 130,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: "#1A1100",
    fontWeight: "700",
  },
});

export default ThreatReportModal;