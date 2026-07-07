import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Modal, StatusBar, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import OnboardingCarousel from "./OnboardingCarousel";

const ONBOARDING_COMPLETED_KEY = "@gabay_onboarding_completed";

const OnboardingScreen = ({ visible, onComplete, onSkip }) => {
  const { colors } = useTheme();

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      onComplete();
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      onSkip();
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      onSkip();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle={colors.textPrimary === "#F5F1EC" ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OnboardingCarousel onComplete={handleComplete} onSkip={handleSkip} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default OnboardingScreen;
