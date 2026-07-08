import { BlurView } from "expo-blur";
import { Compass, Minus, Navigation, Plus } from "lucide-react-native";
import { memo } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * Floating map control stack (Waze/Google Maps style): zoom in/out and a
 * live compass on web (where the MapLibre ref exposes them), plus recenter
 * everywhere. Rendered inside a frosted-glass card.
 *
 * Props:
 *  - mapRef:     ref to MapViewComponent (zoomIn/zoomOut/resetNorth on web)
 *  - bearing:    current map bearing in degrees (rotates the compass needle)
 *  - onRecenter: recenter-on-user handler
 *  - colors, isDarkMode: theme
 */
const MapControls = ({ mapRef, bearing = 0, onRecenter, colors, isDarkMode }) => {
  const isWeb = Platform.OS === "web";
  const iconColor = colors?.textPrimary || "#FFFFFF";

  const Button = ({ onPress, children, accent }) => (
    <TouchableOpacity
      style={[styles.button, accent && { backgroundColor: colors?.primary }]}
      onPress={() => {
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView
        intensity={45}
        tint={isDarkMode ? "dark" : "light"}
        style={[
          styles.stack,
          {
            borderColor: colors?.border,
            // Glass surface must follow the theme — a dark pill with dark
            // icons is invisible in light mode
            backgroundColor: isDarkMode
              ? "rgba(20, 18, 15, 0.35)"
              : "rgba(255, 255, 255, 0.7)",
          },
        ]}
      >
        {isWeb && (
          <>
            <Button onPress={() => mapRef?.current?.zoomIn?.()}>
              <Plus size={20} color={iconColor} />
            </Button>
            <View style={[styles.divider, { backgroundColor: colors?.border }]} />
            <Button onPress={() => mapRef?.current?.zoomOut?.()}>
              <Minus size={20} color={iconColor} />
            </Button>
            <View style={[styles.divider, { backgroundColor: colors?.border }]} />
            <Button onPress={() => mapRef?.current?.resetNorth?.()}>
              <View style={{ transform: [{ rotate: `${-bearing}deg` }] }}>
                <Compass size={20} color={colors?.neonOrange || iconColor} />
              </View>
            </Button>
            <View style={[styles.divider, { backgroundColor: colors?.border }]} />
          </>
        )}
        <Button onPress={() => {
          onRecenter?.();
        }}>
          <Navigation
            size={19}
            color={iconColor}
            fill={iconColor}
            style={{ marginRight: 1, marginTop: 1 }}
          />
        </Button>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 170,
    right: 16,
    zIndex: 10,
  },
  stack: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  button: {
    width: 46,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
  },
});

export default memo(MapControls);
