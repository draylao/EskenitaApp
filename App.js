import { useEffect, useState } from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import OnboardingScreen from "./src/components/onboarding/OnboardingScreen";
import HomeScreen from "./src/screens/HomeScreen";
import { ThemeProvider } from "./src/theme/ThemeContext";
import "./src/utils/webAlertPolyfill";

const ONBOARDING_COMPLETED_KEY = "@gabay_onboarding_completed";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { useTheme } = require("./src/theme/ThemeContext");
  const theme = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      console.log("Onboarding status from storage:", completed);
      // Force show onboarding for web testing - remove this line after testing
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
        setShowOnboarding(true);
      } else {
        setShowOnboarding(completed !== "true");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <OnboardingScreen
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
      <HomeScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
