import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";

const CustomMarker = ({ type, title, rating, onPress }) => {
  const getMarkerImage = () => {
    switch (type) {
      case "haven":
        return require("../../assets/markers/haven-marker.png");
      case "threat":
        return require("../../assets/markers/threat-marker.png");
      case "destination":
        return require("../../assets/markers/destination-marker.png");
      default:
        return require("../../assets/markers/default-marker.png");
    }
  };

  const markerImage = getMarkerImage();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={markerImage}
        style={styles.markerImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  markerImage: {
    width: 90,
    height: 100,
  },
});

export default CustomMarker;
