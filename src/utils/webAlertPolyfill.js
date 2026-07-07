// react-native-web's Alert.alert is a no-op, so dialogs like "Route Blocked"
// and the SOS confirmation silently do nothing on web. Single-button alerts
// become a styled non-blocking toast (window.alert freezes the JS thread,
// which stalls the map and any automation); multi-button alerts map to
// window.confirm since they need a real decision.
import { Alert, Platform } from "react-native";

const TOAST_ID = "eskenita-web-toast";

const showToast = (title, message) => {
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.style.cssText = `
    position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
    max-width: min(420px, calc(100vw - 32px)); z-index: 99999;
    background: rgba(20, 18, 15, 0.95); color: #F5F1EC;
    border: 1px solid #463D33; border-radius: 16px;
    padding: 14px 18px; font-family: system-ui, sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    animation: eskenita-toast-in 250ms ease;
  `;
  toast.innerHTML = `
    <style>@keyframes eskenita-toast-in { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }</style>
    ${title ? `<div style="font-weight:700;font-size:14px;margin-bottom:2px;">${title}</div>` : ""}
    ${message ? `<div style="font-size:13px;color:#A89F93;">${message}</div>` : ""}
  `;
  toast.addEventListener("click", () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
};

if (Platform.OS === "web" && typeof window !== "undefined") {
  Alert.alert = (title, message, buttons) => {
    if (!buttons || buttons.length <= 1) {
      showToast(title, message);
      buttons?.[0]?.onPress?.();
      return;
    }

    const text = [title, message].filter(Boolean).join("\n\n");
    const confirmed = window.confirm(text);
    if (confirmed) {
      (buttons.find((b) => b.style !== "cancel") || buttons[0])?.onPress?.();
    } else {
      buttons.find((b) => b.style === "cancel")?.onPress?.();
    }
  };
}
