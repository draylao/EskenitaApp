import { Ionicons } from "@expo/vector-icons";
import { Camera, Check } from "lucide-react-native";
import { useState } from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import UserIconPicker from "./UserIconPicker";

const ProfileMenu = ({ visible, onClose, userIconType, onIconChange }) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(colors);
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emailText}>user@eskenita.app</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {userIconType === "circle" ? (
                <View style={styles.circleProfile} />
              ) : (
                <Image
                  source={require("../../assets/user-icons/triangle-icon.png")}
                  style={styles.profileImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity style={styles.cameraOverlay}>
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.greetingText}>Hi, User!</Text>
            <TouchableOpacity style={styles.manageAccountBtn}>
              <Text style={styles.manageAccountText}>Manage your Account</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Options */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setIsIconPickerVisible(true)}>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Change Icon</Text>
                <Check size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Dark Mode</Text>
                <Ionicons
                  name={isDarkMode ? "sunny" : "moon"}
                  size={20}
                  color={isDarkMode ? colors.primary : colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Switch account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Your profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Icon Picker Modal */}
        <UserIconPicker
          visible={isIconPickerVisible}
          onClose={() => setIsIconPickerVisible(false)}
          onSelect={(iconType) => {
            onIconChange(iconType);
            setIsIconPickerVisible(false);
          }}
          currentIcon={userIconType}
        />
      </View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
      maxHeight: "80%",
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    emailText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    doneBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    doneText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    profileSection: {
      alignItems: "center",
      marginBottom: 24,
    },
    profileImageContainer: {
      position: "relative",
      marginBottom: 12,
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    circleProfile: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
    },
    cameraOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.card,
    },
    greetingText: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 8,
    },
    manageAccountBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    manageAccountText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    menuSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 16,
    },
    menuItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    menuItemText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
    },
    closeBtn: {
      alignSelf: "center",
      marginTop: 16,
      padding: 8,
    },
  });

export default ProfileMenu;
