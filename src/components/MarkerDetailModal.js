import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import AlertIcon from "./icons/AlertIcon";
import MapPinIcon from "./icons/MapPinIcon";
import ShieldIcon from "./icons/ShieldIcon";

const TYPE_LABELS = {
  haven: "Safe Haven",
  threat: "Reported Threat",
  destination: "Destination",
};

/**
 * Bottom-sheet style detail card for map markers (havens, threats,
 * destination). Slides up from the bottom like modern navigation apps;
 * tapping the dimmed backdrop dismisses it.
 */
const MarkerDetailModal = ({ visible, onClose, marker, onGo }) => {
  const { colors } = useTheme();
  if (!marker) return null;

  const styles = createStyles(colors);
  const accent = marker.color || colors.primary;

  const getIcon = () => {
    switch (marker.type) {
      case "haven":
        return <ShieldIcon size={26} color={accent} />;
      case "threat":
        return <AlertIcon size={26} color={accent} />;
      default:
        return <MapPinIcon size={26} color={accent} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop tap dismisses, like a real bottom sheet */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View
              style={[styles.iconBubble, { backgroundColor: accent + "22" }]}
            >
              {getIcon()}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {marker.title}
              </Text>
              <Text style={[styles.typeLabel, { color: accent }]}>
                {TYPE_LABELS[marker.type] || "Location"}
              </Text>
            </View>
            {marker.rating != null && marker.rating > 0 && (
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText}>⭐ {marker.rating}</Text>
              </View>
            )}
          </View>

          {(marker.severity || marker.distance) && (
            <View style={styles.chipRow}>
              {marker.severity && (
                <View style={[styles.chip, { borderColor: accent }]}>
                  <Text style={[styles.chipText, { color: accent }]}>
                    Severity: {marker.severity}
                  </Text>
                </View>
              )}
              {marker.distance && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{marker.distance} km away</Text>
                </View>
              )}
            </View>
          )}

          {marker.description && (
            <Text style={styles.description}>{marker.description}</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
            {marker?.type === "haven" && onGo && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accent }]}
                onPress={onGo}
              >
                <Text style={styles.primaryBtnText}>Go</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 16,
      // Keep the sheet readable on wide desktop windows
      alignSelf: "center",
      width: "100%",
      maxWidth: 520,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    iconBubble: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: "center",
      alignItems: "center",
    },
    headerText: { flex: 1 },
    title: {
      color: colors.textPrimary,
      fontSize: 19,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    typeLabel: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 2,
    },
    ratingPill: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    ratingText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
      flexWrap: "wrap",
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    description: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 14,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 22,
    },
    secondaryBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 15,
    },
    primaryBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
    },
    primaryBtnText: {
      color: "#0F172A",
      fontWeight: "800",
      fontSize: 15,
      letterSpacing: 0.3,
    },
  });

export default MarkerDetailModal;
