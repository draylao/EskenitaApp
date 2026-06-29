import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { colors } from "../theme/colors";
import mapStyle from "../theme/mapStyle.json";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const MapViewComponent = ({ threatPins }) => {
  // Mock Coordinates anchored in Cabanatuan City
  const origin = { latitude: 15.4828, longitude: 120.9749 }; // Near NEUST
  const destination = { latitude: 15.4716, longitude: 120.9822 }; // SM City Area

  const routeAFastest = [
    origin,
    { latitude: 15.478, longitude: 120.976 },
    destination,
  ];

  const routeBSafe = [
    origin,
    { latitude: 15.48, longitude: 120.98 },
    { latitude: 15.475, longitude: 120.985 },
    destination,
  ];

  const safeHavens = [
    {
      id: 1,
      latlng: { latitude: 15.48, longitude: 120.98 },
      title: "7-Eleven (24/7)",
    },
    {
      id: 2,
      latlng: { latitude: 15.475, longitude: 120.985 },
      title: "Alfmart",
    },
    {
      id: 3,
      latlng: { latitude: 15.473, longitude: 120.983 },
      title: "Barangay Hall",
    },
  ];

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: 15.477,
          longitude: 120.979,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        <Marker
          coordinate={origin}
          title="Start"
          pinColor={colors.textPrimary}
        />
        <Marker
          coordinate={destination}
          title="Destination"
          pinColor={colors.textPrimary}
        />

        {/* Route A - Fastest (Dashed) */}
        <Polyline
          coordinates={routeAFastest}
          strokeColor={colors.routeFastest}
          strokeWidth={4}
          lineDashPattern={[10, 10]}
        />

        {/* Route B - Eskenita Safe (Glowing Neon Green) */}
        <Polyline
          coordinates={routeBSafe}
          strokeColor={colors.neonGreen}
          strokeWidth={6}
        />

        {/* Safe Havens */}
        {safeHavens.map((haven) => (
          <Marker
            key={haven.id}
            coordinate={haven.latlng}
            title={haven.title}
            description="Safe Haven"
            pinColor={colors.neonGreen}
          />
        ))}

        {/* AI-Generated Threat Pins */}
        {threatPins.map((pin, index) => (
          <Marker
            key={`threat-${index}`}
            coordinate={pin.coordinates}
            title="Threat Detected"
            pinColor={colors.neonRed}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  map: { ...StyleSheet.absoluteFillObject },
});

export default MapViewComponent;
