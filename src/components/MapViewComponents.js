import React, { useMemo, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import mapStyle from "../theme/mapStyle.json";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const MapViewComponent = ({ threatPins, destination }) => {
  const [lineScale, setLineScale] = useState(1);
  const origin = { latitude: 15.4828, longitude: 120.9749 }; // Near NEUST

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
  const routeVector = destination
    ? {
      x:
        (destination.longitude - origin.longitude) *
        Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
      y: destination.latitude - origin.latitude,
    }
    : { x: 0, y: 0 };

  const projectionOnRoute = (point) => {
    if (!destination) return -1;
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
    if (!destination) return 999;
    const pointVec = {
      x:
        (point.longitude - origin.longitude) *
        Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
      y: point.latitude - origin.latitude,
    };
    const proj = projectionOnRoute(point);
    const closest = { x: routeVector.x * proj, y: routeVector.y * proj };
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

  // Base width scaled by zoom level. Size is back to medium.
  const routeStrokeWidth = Math.max(3, Math.round(5 * lineScale));
  // Gap between squared dots scales with their size. Multiplier increased to 10 to drastically reduce the amount of dots.
  const routeDashPattern = Platform.OS === "ios" ? [routeStrokeWidth, routeStrokeWidth * 10] : [0, routeStrokeWidth * 10];

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        onRegionChangeComplete={(region) => {
          const newScale = 0.03 / region.latitudeDelta;
          setLineScale(Math.min(Math.max(newScale, 0.5), 3));
        }}
      >
        {/* iOS Fixed Custom Pin View */}
        <Marker coordinate={origin} title="Current Location">
          <View style={styles.customMarker}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        </Marker>

        {destination && (
          <>
            <Marker coordinate={destination} title="Destination">
              <View style={styles.customMarker}>
                <Text style={{ fontSize: 24 }}>📍</Text>
              </View>
            </Marker>

            <MapViewDirections
              origin={origin}
              destination={destination}
              waypoints={safeRouteWaypoints}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={routeStrokeWidth}
              strokeColor="#2196F3"
              lineCap="round"
              lineDashPattern={routeDashPattern}
              mode="DRIVING"
              optimizeWaypoints={false}
              zIndex={3}
            />

            <MapViewDirections
              origin={origin}
              destination={destination}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={routeStrokeWidth}
              strokeColor="#888888"
              lineCap="round"
              lineDashPattern={routeDashPattern}
              mode="DRIVING"
              optimizeWaypoints={false}
              zIndex={2}
            />


          </>
        )}

        {destination &&
          filteredSafeHavens.map((haven) => (
            <Marker
              key={haven.id}
              coordinate={haven.latlng}
              title={haven.title}
            >
              <View style={styles.customMarker}>
                <Text style={{ fontSize: 22 }}>🟢</Text>
              </View>
            </Marker>
          ))}

        {threatPins.map((pin, index) => (
          <Marker
            key={`threat-${index}`}
            coordinate={pin.coordinates}
            title="Threat Detected"
          >
            <View style={styles.customMarker}>
              <Text style={{ fontSize: 22 }}>🚨</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});

export default MapViewComponent;
