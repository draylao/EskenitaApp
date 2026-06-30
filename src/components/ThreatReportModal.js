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
import { useTheme } from "../theme/ThemeContext";

const ThreatReportModal = ({ visible, onClose, onSubmit }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    await onSubmit(description);
    setIsSubmitting(false);
    setDescription("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.header}>Report a Threat</Text>
          <Text style={styles.subtext}>
            AI will analyze your report and update the safe routing.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Describe the situation... (e.g. suspicious person following me)"
            placeholderTextColor={colors.textSecondary}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.card} />
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

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.3)",
      justifyContent: "center",
      padding: 20,
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    },
    header: {
      color: colors.neonRed,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 8,
    },
    subtext: { color: colors.textSecondary, marginBottom: 16 },
    input: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderRadius: 12,
      padding: 12,
      minHeight: 100,
      textAlignVertical: "top",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.surfaceLight,
    },
    buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    cancelBtn: { padding: 12, borderRadius: 8 },
    btnText: { color: colors.textSecondary, fontWeight: "600" },
    submitBtn: {
      backgroundColor: colors.neonRed,
      padding: 12,
      borderRadius: 8,
      minWidth: 120,
      alignItems: "center",
    },
    submitText: { color: "#FFFFFF", fontWeight: "600" },
  });

export default ThreatReportModal;
