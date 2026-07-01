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



  const getMarkerColor = () => {

    switch (type) {

      case "haven":

        return "#39FF14";

      case "threat":

        return "#FF3131";

      case "destination":

        return "#FF9900";

      default:

        return "#6C63FF";

    }

  };



  const markerImage = getMarkerImage();

  const markerColor = getMarkerColor();



  return (

    <TouchableOpacity

      style={styles.container}

      onPress={onPress}

      activeOpacity={0.8}

    >

      <View style={[styles.markerPin, { backgroundColor: markerColor }]}>

        <View style={styles.pinInner}>

          <Image

            source={markerImage}

            style={styles.markerIcon}

            resizeMode="contain"

          />

        </View>

      </View>

    </TouchableOpacity>

  );

};



const styles = StyleSheet.create({

  container: {

    alignItems: "center",

  },

  markerPin: {

    width: 44,

    height: 56,

    borderRadius: 22,

    justifyContent: "center",

    alignItems: "center",

    shadowColor: "#000",

    shadowOffset: { width: 0, height: 3 },

    shadowOpacity: 0.3,

    shadowRadius: 4,

    elevation: 6,

  },

  pinInner: {

    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",

    alignItems: "center",

  },

  markerIcon: {

    width: 24,

    height: 24,

  },

});



export default CustomMarker;

