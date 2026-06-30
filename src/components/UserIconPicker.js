import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";

const palette = {
  overlay: "rgba(0, 0, 0, 0.6)",
  sheetBg: "#0F1115",
  cardBg: "#1A1D24",
  cardBorder: "#2A2E37",
  selectedBorder: "#FF7A1A",
  chipBg: "#15171D",
  chipBorder: "#272B33",
  accent: "#FF7A1A",
  textPrimary: "#F5F6F8",
  textSecondary: "#A7ACB5",
  textMuted: "#6E727B",
};

const ICON_OPTIONS = [
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle", image: require("../../assets/user-icons/triangle-icon.png") },
];

const UserIconPicker = ({ visible, onClose, onSelect, currentIcon }) => {
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
                activeOpacity={0.85}
              >
                {option.id === "circle" ? (
                  <View
                    style={[
                      styles.circlePreview,
                      currentIcon === option.id && styles.selectedIconPreview,
                    ]}
                  />
                ) : (
                  <Image
                    source={option.image}
                    style={[
                      styles.iconPreview,
                      currentIcon === option.id && styles.selectedIconPreview,
                    ]}
                    resizeMode="contain"
                  />
                )}
                <Text
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  iconOption: {
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    width: 110,
    backgroundColor: palette.cardBg,
    borderWidth: 1.5,
    borderColor: palette.cardBorder,
  },
  selectedIcon: {
    backgroundColor: palette.chipBg,
    borderWidth: 2,
    borderColor: palette.selectedBorder,
  },
  iconPreview: {
    width: 50,
    height: 50,
  },
  circlePreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.accent,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginBottom: 8,
  },
  selectedIconPreview: {
    tintColor: palette.accent,
  },
  iconLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  selectedLabel: {
    color: palette.accent,
    fontWeight: "600",
  },
  closeBtn: {
    backgroundColor: palette.cardBg,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: palette.cardBorder,
  },
  closeText: {
    color: palette.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
});

export default UserIconPicker;
