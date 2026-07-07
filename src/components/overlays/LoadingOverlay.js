import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text } from "react-native";

/**
 * Full-screen overlay shown while something heavy (the map engine, a data
 * refresh) is booting. Fades itself out when `visible` flips to false so the
 * content underneath appears smoothly instead of popping in.
 */
const LoadingOverlay = ({ visible, label = "Loading map…", colors }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.overlay,
        { backgroundColor: colors?.background || "#15120F", opacity },
      ]}
    >
      <ActivityIndicator size="large" color={colors?.primary || "#FF8A3D"} />
      <Text style={[styles.label, { color: colors?.textSecondary || "#A89F93" }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    zIndex: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default LoadingOverlay;
