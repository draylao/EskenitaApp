import { memo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

// Lookup tables instead of switch functions so we don't rebuild these on every render
const MARKER_IMAGES = {
  haven: require("../../../assets/markers/haven-marker.png"),
  threat: require("../../../assets/markers/threat-marker.png"),
  destination: require("../../../assets/markers/destination-marker.png"),
  default: require("../../../assets/markers/default-marker.png"),
};

const MARKER_COLORS = {
  haven: "#39FF14",
  threat: "#FF3131",
  destination: "#FF9900",
  default: "#6C63FF",
};

const CustomMarker = ({ type, title, rating, onPress }) => {
  const markerImage = MARKER_IMAGES[type] || MARKER_IMAGES.default;
  const markerColor = MARKER_COLORS[type] || MARKER_COLORS.default;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.markerBadge, { borderColor: markerColor }]}>
        <Image
          source={markerImage}
          style={styles.markerIcon}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  markerBadge: {
    // Just a thin colored ring now, not a big filled pin shape — the
    // picture is what you see, color is only a slim border for type ID.
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerIcon: {
    // Fills almost the entire badge (only ~4px of white/border padding),
    // so the icon is the dominant thing you see, not the background.
    width: 52,
    height: 52,
  },
});

// Memoized: these render in a list (havens/threats) and don't need to
// re-render unless their own props change.
export default memo(CustomMarker);