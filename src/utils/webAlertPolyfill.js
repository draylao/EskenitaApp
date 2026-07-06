// react-native-web's Alert.alert is a no-op, so dialogs like "Route Blocked"
// and the SOS confirmation silently do nothing on web. Map them to native
// browser dialogs so every alert in the app works in the web demo.
import { Alert, Platform } from "react-native";

if (Platform.OS === "web" && typeof window !== "undefined") {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join("\n\n");

    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const confirmed = window.confirm(text);
    if (confirmed) {
      (buttons.find((b) => b.style !== "cancel") || buttons[0])?.onPress?.();
    } else {
      buttons.find((b) => b.style === "cancel")?.onPress?.();
    }
  };
}
