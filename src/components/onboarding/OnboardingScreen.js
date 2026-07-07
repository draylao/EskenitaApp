import React from "react";
import { Modal, StatusBar, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { storage } from "../../utils/storage";
import OnboardingCarousel from "./OnboardingCarousel";

const ONBOARDING_COMPLETED_KEY = "@gabay_onboarding_completed";

const OnboardingScreen = ({ visible, onComplete, onSkip }) => {
  const { colors } = useTheme();

  const handleComplete = async () => {
    try {
      await storage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      onComplete();
    } catch {
      onComplete();
    }
  };

  const handleSkip = async () => {
    try {
      await storage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      onSkip();
    } catch {
      onSkip();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <StatusBar
        barStyle={
          colors.textPrimary === "#F5F1EC" ? "light-content" : "dark-content"
        }
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OnboardingCarousel onComplete={handleComplete} onSkip={handleSkip} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OnboardingScreen;
