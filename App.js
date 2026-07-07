import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import { ThemeProvider } from "./src/theme/ThemeContext";
import "./src/utils/webAlertPolyfill";

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

  return (
    <SafeAreaProvider
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
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
