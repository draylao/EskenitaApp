import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import CustomMarker from "./CustomMarker";
import MarkerDetailModal from "./MarkerDetailModal";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const getUserIconImage = (iconType) => {
  switch (iconType) {
    case "triangle":
      return require("../../assets/user-icons/triangle-icon.png");
    default:
      return null;
  }
};

const getOffsetCenter = (location, heading, distance = 0.00045) => {
  const rad = ((heading || 0) * Math.PI) / 180;

  return {
    latitude:
      location.latitude - distance * Math.cos(rad),

    longitude:
      location.longitude -
      (distance * Math.sin(rad)) /
      Math.cos((location.latitude * Math.PI) / 180),
  };
};

const getDistance = (coord1, coord2) => {
  const R = 6371e3; // metres
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getDottedCoordinates = (coordinates, intervalMeters) => {
  if (!coordinates || coordinates.length < 2 || intervalMeters <= 0) return [];
  const dots = [];
  let leftover = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    const segmentLength = getDistance(start, end);

    let distanceToNextDot = intervalMeters - leftover;

    while (distanceToNextDot <= segmentLength) {
      const ratio = distanceToNextDot / segmentLength;
      const lat = start.latitude + (end.latitude - start.latitude) * ratio;
      const lng = start.longitude + (end.longitude - start.longitude) * ratio;
      dots.push({ latitude: lat, longitude: lng });
      distanceToNextDot += intervalMeters;
    }

    leftover = segmentLength - (distanceToNextDot - intervalMeters);
  }
  return dots;
};

const MapViewComponent = forwardRef(
  (
    {
      threatPins,
      destination,
      userLocation,
      userHeading,
      safeHavens = [],
      userIconType = "circle",
      selectedRouteType,
      onRouteStatsUpdate,
      isNavigating = false,
      onRouteStepsUpdate,
      isSelectingDestination = false,
      onMapPress,
      colors,
    },
    ref,
  ) => {
    const [lineScale, setLineScale] = useState(1);
    const [iosSafeRouteCoords, setIosSafeRouteCoords] = useState([]);
    const [iosAltRouteCoords, setIosAltRouteCoords] = useState([]);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [isMarkerModalVisible, setIsMarkerModalVisible] = useState(false);
    const [mapRegion, setMapRegion] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(15);
    const origin = userLocation; // || { latitude: 15.4828, longitude: 120.9749 }// 

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
      const lenSq =
        routeVector.x * routeVector.x + routeVector.y * routeVector.y;
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

    const forwardHavens = safeHavens
      .map((haven) => ({
        ...haven,
        projection: projectionOnRoute(haven.latlng),
        distanceFromRoute: distanceToRoute(haven.latlng), // Distance in km from baseline corridor
      }))
      .filter(({ projection }) => projection > 0.05 && projection < 0.95);

    const balancedSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_THRESHOLD = 0.25;
      const PROGRESS_WINDOW_STRIDE = 0.2;

      const linearCorridorSpots = forwardHavens
        .filter((haven) => haven.distanceFromRoute <= MAX_DETOUR_THRESHOLD)
        .sort((a, b) => a.projection - b.projection);

      const smoothedWaypoints = [];
      let currentWindowEnd = PROGRESS_WINDOW_STRIDE;
      let bestSpotInWindow = null;

      for (const spot of linearCorridorSpots) {
        while (spot.projection > currentWindowEnd) {
          if (bestSpotInWindow) {
            smoothedWaypoints.push(bestSpotInWindow.latlng);
            bestSpotInWindow = null;
          }
          currentWindowEnd += PROGRESS_WINDOW_STRIDE;
        }

        if (
          !bestSpotInWindow ||
          spot.distanceFromRoute < bestSpotInWindow.distanceFromRoute
        ) {
          bestSpotInWindow = spot;
        }
      }

      if (bestSpotInWindow) {
        smoothedWaypoints.push(bestSpotInWindow.latlng);
      }

      return smoothedWaypoints;
    }, [forwardHavens, destination]);

    // NEW: Logic to determine alternative safe paths through separate havens
    const alternativeSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_THRESHOLD = 0.4; // Slightly higher threshold to find alternate detours
      const PROGRESS_WINDOW_STRIDE = 0.2;

      const linearCorridorSpots = forwardHavens
        .filter((haven) => haven.distanceFromRoute <= MAX_DETOUR_THRESHOLD)
        .sort((a, b) => a.projection - b.projection);

      const primaryIds = new Set(
        balancedSafeWaypoints.map((w) => `${w.latitude}-${w.longitude}`),
      );
      const smoothedWaypoints = [];
      let currentWindowEnd = PROGRESS_WINDOW_STRIDE;
      let alternativeSpotInWindow = null;

      for (const spot of linearCorridorSpots) {
        // Skip Havens already used by the primary safe route to ensure distinct paths
        if (primaryIds.has(`${spot.latlng.latitude}-${spot.latlng.longitude}`))
          continue;

        while (spot.projection > currentWindowEnd) {
          if (alternativeSpotInWindow) {
            smoothedWaypoints.push(alternativeSpotInWindow.latlng);
            alternativeSpotInWindow = null;
          }
          currentWindowEnd += PROGRESS_WINDOW_STRIDE;
        }

        if (
          !alternativeSpotInWindow ||
          spot.distanceFromRoute < alternativeSpotInWindow.distanceFromRoute
        ) {
          alternativeSpotInWindow = spot;
        }
      }

      if (alternativeSpotInWindow) {
        smoothedWaypoints.push(alternativeSpotInWindow.latlng);
      }

      // Fallback: if no alternative safe havens were found, offset primary to prevent visual duplication
      if (smoothedWaypoints.length === 0 && balancedSafeWaypoints.length > 0) {
        return balancedSafeWaypoints.map((w) => ({
          latitude: w.latitude + 0.0004,
          longitude: w.longitude + 0.0004,
        }));
      }

      return smoothedWaypoints;
    }, [forwardHavens, destination, balancedSafeWaypoints]);

    const routeStrokeWidth = Math.max(3, Math.round(5 * lineScale));

    // Auto-fit map to show full route when destination is set
    useEffect(() => {
      if (destination && ref?.current && !isNavigating) {
        ref.current.fitToCoordinates([origin, destination], {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    }, [destination, origin, ref, isNavigating]);

    // First-person navigation camera: tilt + heading-up + follow user marker
    useEffect(() => {
      if (isNavigating && ref?.current && origin) {
        ref.current.animateCamera(
          {
            center: origin,
            pitch: 70,
            heading: userHeading || 0,
            zoom: 25.5,
          },
          { duration: 600 },
        );
      }
    }, [isNavigating, origin, userHeading, ref]);

    return (
      <View style={styles.container}>
        <MapView
          ref={ref}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={colors?.mapStyle}
          initialRegion={{
            latitude: origin.latitude,
            longitude: origin.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          onRegionChangeComplete={(region) => {
            const newScale = 0.03 / region.latitudeDelta;
            setLineScale(Math.min(Math.max(newScale, 0.5), 3));
            setMapRegion(region);
            // Calculate approximate zoom level from latitudeDelta
            const zoom = Math.log2(360 / region.latitudeDelta);
            setZoomLevel(zoom);
          }}
          onPress={(event) => {
            if (isSelectingDestination && onMapPress) {
              const coordinate = event.nativeEvent.coordinate;
              onMapPress(coordinate);
            }
          }}
        >
          {/* User Location Marker */}
          <Marker
            coordinate={origin}
            title="Current Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerContainer}>
              <View
                style={[
                  styles.coneWrapper,
                  { transform: [{ rotate: `${userHeading || 0}deg` }] },
                ]}
              >
                <Svg height="100" width="100">
                  <Defs>
                    <RadialGradient
                      id="coneGrad"
                      cx="50"
                      cy="50"
                      r="50"
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop
                        offset="0"
                        stopColor={colors?.userConeColor || "#1A73E8"}
                        stopOpacity="0.5"
                      />
                      <Stop
                        offset="1"
                        stopColor={colors?.userConeColor || "#1A73E8"}
                        stopOpacity="0"
                      />
                    </RadialGradient>
                  </Defs>
                  <Path
                    d="M 50,50 L 20,10 Q 50,-5 80,10 Z"
                    fill="url(#coneGrad)"
                  />
                </Svg>
              </View>
              {userIconType === "circle" ? (
                <View style={styles.userLocationDot} />
              ) : (
                <Image
                  source={getUserIconImage(userIconType)}
                  style={[
                    styles.userIconImage,
                    { transform: [{ rotate: `${userHeading || 0}deg` }] },
                  ]}
                  resizeMode="contain"
                />
              )}
            </View>
          </Marker>

          {destination && (
            <>
              <Marker
                coordinate={destination}
                title="Destination"
                anchor={{ x: 0.5, y: 1 }}
                flat={true}
                zIndex={2}
                onPress={() => {
                  setSelectedMarker({
                    type: "destination",
                    title: "Destination",
                    color: colors?.neonOrange || "#FF9900",
                    description: "Your selected destination",
                  });
                  setIsMarkerModalVisible(true);
                }}
              >
                <CustomMarker type="destination" title="Destination" />
              </Marker>

              {/* Dangerous route */}
              <MapViewDirections
                origin={origin}
                destination={destination}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={
                  selectedRouteType === "dangerous"
                    ? routeStrokeWidth + 2
                    : routeStrokeWidth
                }
                strokeColor={
                  selectedRouteType === "dangerous"
                    ? colors?.routeDangerous || "#8B5CF6"
                    : colors?.routeDangerousLight || "rgba(139, 92, 246, 0.45)"
                }
                lineCap="round"
                lineDashPattern={[0, 0]}
                mode="WALKING"
                optimizeWaypoints={false}
                zIndex={selectedRouteType === "dangerous" ? 4 : 2}
                // onReady={(result) => {
                //   console.log("Dangerous route ready:", result);
                //   onRouteStatsUpdate?.("dangerous", {
                //     duration: result.duration,
                //     distance: result.distance,
                //   });
                // }}
                onError={(error) => {
                  console.error("Dangerous route error:", error);
                }}
              />

              {/* Safe route */}
              <MapViewDirections
                origin={origin}
                destination={destination}
                waypoints={balancedSafeWaypoints}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={
                  selectedRouteType === "safe"
                    ? routeStrokeWidth + 3
                    : routeStrokeWidth
                }
                strokeColor={
                  selectedRouteType === "safe"
                    ? colors?.routeSafe || "#28A745"
                    : colors?.routeSafeLight || "rgba(40, 167, 69, 0.45)"
                }
                lineCap="round"
                lineDashPattern={[0, 0]}
                mode="WALKING"
                optimizeWaypoints={false}
                zIndex={selectedRouteType === "safe" ? 5 : 3}
              // onReady={(result) => {
              //   console.log("Safe route ready:", result);
              //   onRouteStatsUpdate?.("safe", {
              //     duration: result.duration,
              //     distance: result.distance,
              //   });
              //   if (selectedRouteType === "safe") {
              //     onRouteStepsUpdate?.(result.legs?.[0]?.steps || []);
              //   }
              // }}
              />

              {/* NEW: Alternative Safe Route */}
              <MapViewDirections
                origin={origin}
                destination={destination}
                waypoints={alternativeSafeWaypoints}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={
                  selectedRouteType === "safeAlt"
                    ? routeStrokeWidth + 3
                    : routeStrokeWidth
                }
                strokeColor={
                  selectedRouteType === "safeAlt"
                    ? colors?.routeAlt || "#17A2B8"
                    : colors?.routeAltLight || "rgba(23, 162, 184, 0.45)"
                }
                lineCap="round"
                lineDashPattern={[0, 0]}
                mode="WALKING"
                optimizeWaypoints={false}
                zIndex={selectedRouteType === "safeAlt" ? 5 : 3}
                onReady={(result) => {
                  onRouteStatsUpdate?.("safeAlt", {
                    duration: result.duration,
                    distance: result.distance,
                  });
                  if (selectedRouteType === "safeAlt") {
                    onRouteStepsUpdate?.(result.legs?.[0]?.steps || []);
                  }
                }}
                onError={(error) => {
                  console.error("Safe route error:", error);
                }}
              />
            </>
          )}

          {/* Render all surrounding safety points */}
          {safeHavens.map((haven) => (
            <Marker
              key={haven.id}
              coordinate={haven.latlng}
              title={haven.title}
              anchor={{ x: 0.5, y: 1 }}
              flat={true}
              zIndex={1}
              onPress={() => {
                setSelectedMarker({
                  type: "haven",
                  title: haven.title,
                  color: "#39FF14",
                  rating: haven.rating,
                  description: "Safe haven location",
                });
                setIsMarkerModalVisible(true);
              }}
            >
              <CustomMarker
                type="haven"
                title={haven.title}
                rating={haven.rating}
              />
            </Marker>
          ))}

          {/* Render threat pins */}
          {threatPins.map((threat) => {
            if (!threat.location || !threat.location.latitude || !threat.location.longitude) {
              return null;
            }
            return (
              <Marker
                key={threat.id}
                coordinate={threat.location}
                title={threat.category}
                description={threat.description}
                anchor={{ x: 0.5, y: 1 }}
                flat={true}
                zIndex={3}
                onPress={() => {
                  setSelectedMarker({
                    type: "threat",
                    title: threat.category,
                    color: "#FF3131",
                    severity: threat.severity,
                    description: threat.description,
                  });

                  setIsMarkerModalVisible(true);
                }}
              >
                <CustomMarker
                  type="threat"
                  title={threat.category}
                />
              </Marker>
            );
          })}
        </MapView>

        <MarkerDetailModal
          visible={isMarkerModalVisible}
          onClose={() => {
            setIsMarkerModalVisible(false);
            setSelectedMarker(null);
          }}
          marker={selectedMarker}
        />
      </View>
    );
  },
);

MapViewComponent.displayName = "MapViewComponent";

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  map: { ...StyleSheet.absoluteFillObject },
  userMarkerContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  coneWrapper: {
    position: "absolute",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  userLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1A73E8",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 2,
  },
  userIconImage: {
    width: 64,
    height: 64,
    zIndex: 2,
  },
  customMarker: {
    backgroundColor: "#1A73E8",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 2,
  },
});

export default MapViewComponent;
