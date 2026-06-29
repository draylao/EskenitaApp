import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { colors } from "../theme/colors";
import mapStyle from "../theme/mapStyle.json";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const MapViewComponent = ({ threatPins }) => {
  const origin = { latitude: 15.4828, longitude: 120.9749 }; // Near NEUST
  const destination = { latitude: 15.4716, longitude: 120.9822 }; // SM City Area

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

  const toRad = (value) => (value * Math.PI) / 180;

  const distance = (a, b) => {
    const R = 6371; // Earth radius in km
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h =
      sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const routeVector = {
    x:
      (destination.longitude - origin.longitude) *
      Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
    y: destination.latitude - origin.latitude,
  };

  const projectionOnRoute = (point) => {
    const pointVec = {
      x:
        (point.longitude - origin.longitude) *
        Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
      y: point.latitude - origin.latitude,
    };

    const dot = pointVec.x * routeVector.x + pointVec.y * routeVector.y;
    const lenSq = routeVector.x * routeVector.x + routeVector.y * routeVector.y;
    return lenSq === 0 ? 0 : dot / lenSq;
  };

  const distanceToRoute = (point) => {
    const pointVec = {
      x:
        (point.longitude - origin.longitude) *
        Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
      y: point.latitude - origin.latitude,
    };
    const proj = projectionOnRoute(point);
    const closest = {
      x: routeVector.x * proj,
      y: routeVector.y * proj,
    };
    const dx = pointVec.x - closest.x;
    const dy = pointVec.y - closest.y;
    return Math.sqrt(dx * dx + dy * dy) * 111.32; // km per degree
  };

  const filteredSafeHavens = safeHavens
    .map((haven) => ({
      ...haven,
      projection: projectionOnRoute(haven.latlng),
      distanceFromRoute: distanceToRoute(haven.latlng),
    }))
    .filter(
      ({ projection, distanceFromRoute }) =>
        projection >= 0 && projection <= 1 && distanceFromRoute <= 0.25,
    )
    .sort((a, b) => a.projection - b.projection);

  const safeRouteWaypoints = filteredSafeHavens.map((haven) => haven.latlng);

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

        {/* Route B - Eskenita Safe (Uses actual Google road path via waypoints) */}
        <MapViewDirections
          origin={origin}
          destination={destination}
          waypoints={safeRouteWaypoints}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={6}
          strokeColor={colors.neonGreen}
          mode="DRIVING"
          optimizeWaypoints={false}
          zIndex={1}
          onError={(errorMessage) =>
            console.warn("Directions error: ", errorMessage)
          }
        />

        {/* Route A - Fastest (Uses actual Google road path) */}
        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={4}
          strokeColor={colors.routeFastest}
          lineDashPattern={[10, 8]}
          mode="DRIVING"
          optimizeWaypoints={false}
          zIndex={2}
          onError={(errorMessage) =>
            console.warn("Directions error: ", errorMessage)
          }
        />

        {/* Safe Havens near the route before the destination */}
        {filteredSafeHavens.map((haven) => (
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
