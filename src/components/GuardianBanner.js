import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";

const GuardianBanner = ({ isActive, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
      <Text style={styles.text}>🟢 Digital Kasama Active</Text>
      <TouchableOpacity onPress={onCancel}>
        <Text style={styles.cancelText}>Stop</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 160,
    left: 20,
    right: 20,
    backgroundColor: "rgba(57, 255, 20, 0.15)",
    borderColor: colors.neonGreen,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  text: { color: colors.neonGreen, fontWeight: "bold", fontSize: 16 },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "bold",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default GuardianBanner;
