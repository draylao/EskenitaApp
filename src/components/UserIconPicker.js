import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const ICON_OPTIONS = [
  { id: "circle", label: "Circle", color: "#1A73E8" },
  { id: "triangle", label: "Triangle", color: "#00CED1" },
];

const UserIconPicker = ({ visible, onClose, onSelect, currentIcon }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose Your Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.iconOption,
                  currentIcon === option.id && styles.selectedIcon,
                ]}
                onPress={() => onSelect(option.id)}
              >
                <View
                  style={[
                    styles.iconPreview,
                    { backgroundColor: option.color },
                    option.id === "triangle" && styles.triangleIcon,
                    option.id === "diamond" && styles.diamondIcon,
                    option.id === "star" && styles.starIcon,
                  ]}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.iconLabel,
                    currentIcon === option.id && styles.selectedLabel,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
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
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 20,
      textAlign: "center",
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 15,
      marginBottom: 20,
    },
    iconOption: {
      alignItems: "center",
      padding: 10,
      borderRadius: 12,
      width: 90,
    },
    selectedIcon: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    iconPreview: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginBottom: 8,
    },
    triangleIcon: {
      borderRadius: 0,
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderLeftWidth: 20,
      borderRightWidth: 20,
      borderBottomWidth: 35,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: "#00CED1",
    },
    iconLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
      flexShrink: 1,
    },
    selectedLabel: {
      color: colors.primary,
      fontWeight: "600",
    },
    closeBtn: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    closeText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
  });

export default UserIconPicker;
