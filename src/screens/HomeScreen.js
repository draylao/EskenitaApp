import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { Navigation, ShieldCheck, TriangleAlert, Users } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GuardianProtectionPanel from "../components/GuardianProtectionPanel";
import MapViewComponent from "../components/MapViewComponents";
import NavigationHud from "../components/NavigationHud";
import ThreatReportModal from "../components/ThreatReportModal";
import UserIconPicker from "../components/UserIconPicker";
import RouteComparisonPanel from "../components/RouteComparisonPanel";
import HavenSelectorModal from "../components/HavenSelectorModal";
import { analyzeThreatWithAI } from "../services/MockVertexAi";
import { fetchDynamicSafeHavens } from "../services/PlacesServices";
import { colors } from "../theme/colors";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const HomeScreen = () => {
  const [threatPins, setThreatPins] = useState([]);
  const [destination, setDestination] = useState({ latitude: 15.4716, longitude: 120.9822 });
  const [dynamicSafeHavens, setDynamicSafeHavens] = useState([]);

  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isDeadZoneActive, setIsDeadZoneActive] = useState(false);
  const [deadZoneTimeLeft, setDeadZoneTimeLeft] = useState(240);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSosTriggered, setIsSosTriggered] = useState(false);
  const [activeTab, setActiveTab] = useState("navigate");
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  const [userIconType, setUserIconType] = useState("circle");
  const [selectedRouteType, setSelectedRouteType] = useState("safe");
  const [routeStats, setRouteStats] = useState({ safe: null, dangerous: null });
  const [isGuardianSheetOpen, setIsGuardianSheetOpen] = useState(false);
  const [isHavenSelectorVisible, setIsHavenSelectorVisible] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  
  const bottomSheetRef = useRef(null);
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();
  const googlePlacesRef = useRef(null);

  const snapPoints = useMemo(() => {
    return [insets.bottom > 0 ? "12%" : "10%"];
  }, [insets.bottom]);

  const [userLocation, setUserLocation] = useState({
    latitude: 15.4828,
    longitude: 120.9749,
  });
  const [userHeading, setUserHeading] = useState(0);
  const [userSpeedKmh, setUserSpeedKmh] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleSetDestination = () => {
    setDestination({ latitude: 15.4716, longitude: 120.9822 });
  };

  const handleClearRoute = () => {
    setDestination(null);
    setSelectedRouteType("safe");
    setRouteStats({ safe: null, dangerous: null });
    googlePlacesRef.current?.setAddressText("");
  };

  const handleSelectRoute = (routeType) => {
    if (routeType === "dangerous") {
      Alert.alert(
        "Route Blocked",
        "This route passes through danger zones and is not available. Please use the safe route.",
      );
      return;
    }
    setSelectedRouteType("safe");
  };

  const handleRouteStatsUpdate = (routeType, stats) => {
    setRouteStats((prev) => ({ ...prev, [routeType]: stats }));
  };

  const handleStartNavigation = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
  };

  const handleExitNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
  };

  const handleShareGuardian = () => {
    Alert.alert("Link Copied!", "Live location link copied to clipboard.");
    setIsGuardianActive(true);
  };

  const handleReportThreat = async (report) => {
    const aiResult = await analyzeThreatWithAI(report.description);

    const newThreat = {
      id: Date.now().toString(),
      category: report.category,
      severity: report.severity,
      description: report.description,
      location: report.location || userLocation,
      locationLabel: report.locationLabel,
      reportedAt: report.reportedAt,
      ai: aiResult,
    };

    setThreatPins((prev) => [...prev, newThreat]);

    setIsModalVisible(false);
  };

  const handleSOS = () => {
    setIsDeadZoneActive(false);
    setIsSosTriggered(true);
    Alert.alert("CRITICAL", "Siren & Offline SMS triggered!", [
      { text: "Dismiss", onPress: () => setIsSosTriggered(false) },
    ]);
  };

  const handleToggleDeadZone = (value) => {
    setIsDeadZoneActive(value);
    if (value) {
      setDeadZoneTimeLeft(240);
    }
  };

  useEffect(() => {
    if (!isDeadZoneActive) {
      setDeadZoneTimeLeft(240);
      return;
    }
    if (deadZoneTimeLeft <= 0) {
      handleSOS();
      return;
    }
    const interval = setInterval(() => {
      setDeadZoneTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDeadZoneActive, deadZoneTimeLeft]);

  // Advance to next turn-by-turn step once the user gets close to the current step's end point
  useEffect(() => {
    if (!isNavigating || navigationSteps.length === 0 || !userLocation) return;

    const step = navigationSteps[currentStepIndex];
    if (!step?.end_location) return;

    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371e3;
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(step.end_location.lat);
    const dLat = toRad(step.end_location.lat - userLocation.latitude);
    const dLon = toRad(step.end_location.lng - userLocation.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const distanceToStepEnd = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distanceToStepEnd < 20 && currentStepIndex < navigationSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [userLocation, isNavigating, navigationSteps, currentStepIndex]);

  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        },
        { duration: 1000 },
      );
    }
  };

  useEffect(() => {
    if (userLocation) {
      const getJourneySafeHavens = async () => {
        try {
          // 1. Always fetch safe spots around user's current location
          const startHavens = await fetchDynamicSafeHavens(
            userLocation.latitude,
            userLocation.longitude,
          );

          let endHavens = [];
          // 2. If a destination is chosen, fetch safe spots around the destination too
          if (destination) {
            endHavens = await fetchDynamicSafeHavens(
              destination.latitude,
              destination.longitude,
            );
          }

          // 3. Combine and filter out any duplicates by their unique ID
          const combined = [...startHavens, ...endHavens];
          const uniqueHavens = Array.from(
            new Map(combined.map((haven) => [haven.id, haven])).values(),
          );

          setDynamicSafeHavens(uniqueHavens);
        } catch (err) {
          console.error("Error aggregating safe havens along route:", err);
        }
      };

      getJourneySafeHavens();
    }
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    destination?.latitude,
    destination?.longitude,
  ]);
  useEffect(() => {
    let locationSubscription;
    let headingSubscription;

    const startTracking = async () => {
      // Request background/foreground permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permissions are required for real-time tracking.",
        );
        return;
      }

      // Get initial position quickly
      let initialLoc = await Location.getLastKnownPositionAsync({});
      if (initialLoc) {
        setUserLocation({
          latitude: initialLoc.coords.latitude,
          longitude: initialLoc.coords.longitude,
        });
      }

      // Subscribe to real-time position updates
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5, // Increased to 5 meters to reduce micro-jitter
          timeInterval: 4000, // Reduced frequency to smooth out updates
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          if (location.coords.speed != null && location.coords.speed >= 0) {
            setUserSpeedKmh(location.coords.speed * 3.6);
          }
        },
      );

      // Subscribe to device heading updates for the navigation cone
      headingSubscription = await Location.watchHeadingAsync((headingObj) => {
        const newHeading =
          headingObj.trueHeading !== -1
            ? headingObj.trueHeading
            : headingObj.magHeading;

        setUserHeading((prevHeading) => {
          // Calculate the shortest path difference to handle 359 -> 1 wrap-around
          let diff = Math.abs(newHeading - prevHeading);
          if (diff > 180) diff = 360 - diff;

          // Only apply update if the device turned more than 3 degrees (filters out micro-jitter)
          if (diff > 3) {
            return newHeading;
          }
          return prevHeading;
        });
      });
    };

    startTracking();

    // Clean up subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isSosTriggered && styles.sosBackground]}>
        <MapViewComponent
          ref={mapRef}
          threatPins={threatPins}
          destination={destination}
          userLocation={userLocation}
          userHeading={userHeading}
          safeHavens={dynamicSafeHavens}
          userIconType={userIconType}
          selectedRouteType={selectedRouteType}
          onRouteStatsUpdate={handleRouteStatsUpdate}
          isNavigating={isNavigating}
          onRouteStepsUpdate={setNavigationSteps}
          isSelectingDestination={isSelectingDestination}
          onMapPress={(coordinate) => {
            if (isSelectingDestination) {
              setDestination(coordinate);
              setIsSelectingDestination(false);
              setSelectedRouteType("safe");
              setRouteStats({ safe: null, dangerous: null });
            }
          }}
        />

        {/* Minimal Search Bar */}
        {!isNavigating && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRowContainer}>
            <GooglePlacesAutocomplete
              ref={googlePlacesRef}
              placeholder={
                destination ? "Routing to Destination..." : "Search here"
              }
              fetchDetails={true} // Crucial to grab the lat/lng details
              onPress={(data, details = null) => {
                if (details) {
                  setDestination({
                    latitude: details.geometry.location.lat,
                    longitude: details.geometry.location.lng,
                  });
                  setSelectedRouteType("safe");
                  setRouteStats({ safe: null, dangerous: null });
                  googlePlacesRef.current?.blur();
                }
              }}
              onFail={(error) => {
                console.error("Google Places API Error:", error);
                // Optional: Alert it to your screen so you see it instantly during development
                Alert.alert("API Error", error);
              }}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: "en",
                components: "country:ph",
                location: `${userLocation.latitude},${userLocation.longitude}`,
                radius: "10000",
                strictbounds: true,
              }}
              styles={{
                container: { flex: 1 },
                textInputContainer: styles.textInputContainer,
                textInput: styles.textInput,
                listView: destination ? { display: "none" } : styles.listView,
                row: styles.searchRow,
                description: styles.searchDescription,
              }}
              enablePoweredByContainer={false}
            />
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearRoute}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Recenter Map Button */}
        {!isNavigating && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
        >
          <Navigation
            size={24}
            color="#FFFFFF"
            fill="#FFFFFF"
            style={{ marginRight: 2, marginTop: 2 }}
          />
        </TouchableOpacity>
        )}

        {/* Select Destination Button */}
        {!isNavigating && (
        <TouchableOpacity
          style={[styles.recenterButton, styles.selectDestinationButton, isSelectingDestination && styles.selectDestinationActive]}
          onPress={() => setIsSelectingDestination(!isSelectingDestination)}
        >
          <Image
            source={require("../../assets/markers/destination-marker.png")}
            style={styles.destinationButtonIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        )}

        {/* Modern Toolbar Component on Bottom Layer */}
        {!isNavigating && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={{ display: "none" }}
        >
          <BottomSheetView
            style={[
              styles.toolbarContent,
              { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
            ]}
          >
            {/* Navigate Tab */}
            <TouchableOpacity
              style={[styles.toolbarItem, activeTab === "navigate" && styles.activeTab]}
              onPress={() => setActiveTab("navigate")}
            >
              <Navigation
                size={22}
                color={activeTab === "navigate" ? colors.primary : colors.textSecondary}
                style={styles.toolbarIcon}
              />
              <Text
                style={[
                  styles.toolbarLabel,
                  activeTab === "navigate" && styles.activeTabLabel,
                ]}
              >
                Navigate
              </Text>
            </TouchableOpacity>

            {/* Report Tab */}
            <TouchableOpacity
              style={[styles.toolbarItem, activeTab === "report" && styles.activeTab]}
              onPress={() => {
                setActiveTab("report");
                setIsModalVisible(true);
              }}
            >
              <TriangleAlert
                size={22}
                color={activeTab === "report" ? colors.primary : colors.textSecondary}
                style={styles.toolbarIcon}
              />
              <Text
                style={[
                  styles.toolbarLabel,
                  activeTab === "report" && styles.activeTabLabel,
                ]}
              >
                Report
              </Text>
            </TouchableOpacity>

            {/* Guardian Tab */}
            <TouchableOpacity
              style={[styles.toolbarItem, activeTab === "guardian" && styles.activeTab]}
              onPress={() => {
                setActiveTab("guardian");
                handleShareGuardian();
              }}
            >
              <Users
                size={22}
                color={activeTab === "guardian" ? colors.primary : colors.textSecondary}
                style={styles.toolbarIcon}
              />
              <Text
                style={[
                  styles.toolbarLabel,
                  activeTab === "guardian" && styles.activeTabLabel,
                ]}
              >
                Guardian
              </Text>
            </TouchableOpacity>

            {/* Havens Tab */}
            <TouchableOpacity
              style={[styles.toolbarItem, activeTab === "havens" && styles.activeTab]}
              onPress={() => {
                setActiveTab("havens");
                setIsHavenSelectorVisible(true);
              }}
            >
              <ShieldCheck
                size={22}
                color={activeTab === "havens" ? colors.primary : colors.textSecondary}
                style={styles.toolbarIcon}
              />
              <Text
                style={[
                  styles.toolbarLabel,
                  activeTab === "havens" && styles.activeTabLabel,
                ]}
              >
                Havens
              </Text>
            </TouchableOpacity>

            {/* Customize Icon Button */}
            <TouchableOpacity
              style={styles.toolbarItem}
              onPress={() => setIsIconPickerVisible(true)}
            >
              <View style={styles.customizeIconPreview}>
                {userIconType === "circle" ? (
                  <View style={styles.customizeIconDot} />
                ) : (
                  <Image
                    source={require("../../assets/user-icons/triangle-icon.png")}
                    style={styles.customizeIconImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={styles.toolbarLabel}>Icon</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
        )}

        <ThreatReportModal
            visible={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            userLocation={userLocation}
            locationLabel="Current Location"
            onSubmit={handleReportThreat}
        />

        <UserIconPicker
          visible={isIconPickerVisible}
          onClose={() => setIsIconPickerVisible(false)}
          onSelect={(iconType) => setUserIconType(iconType)}
          currentIcon={userIconType}
        />

        <HavenSelectorModal
          visible={isHavenSelectorVisible}
          onClose={() => setIsHavenSelectorVisible(false)}
          havens={dynamicSafeHavens}
          userLocation={userLocation}
          onSelectHaven={(haven) => {
            setDestination(haven.latlng);
            setSelectedRouteType("safe");
          }}
        />

        {isNavigating && (
          <NavigationHud
            visible={isNavigating}
            currentStep={navigationSteps[currentStepIndex]}
            nextStepPreview={navigationSteps[currentStepIndex + 1]}
            totalDistanceRemaining={navigationSteps
              .slice(currentStepIndex)
              .reduce((sum, step) => sum + (step.distance?.value || 0), 0)}
            totalDurationRemaining={navigationSteps
              .slice(currentStepIndex)
              .reduce((sum, step) => sum + (step.duration?.value || 0), 0)}
            speedKmh={userSpeedKmh}
            onExit={handleExitNavigation}
          />
        )}

        {isNavigating && !isGuardianSheetOpen && (
          <TouchableOpacity
            style={[
              styles.guardianFab,
              isGuardianActive && styles.guardianFabActive,
            ]}
            onPress={() => setIsGuardianSheetOpen(true)}
          >
            <ShieldCheck
              size={22}
              color={isGuardianActive ? "#15120F" : colors.neonGreen}
            />
          </TouchableOpacity>
        )}

        {isNavigating ? (
          isGuardianSheetOpen && (
            <GuardianProtectionPanel
              visible={isGuardianSheetOpen}
              isDeadZoneActive={isDeadZoneActive}
              timeLeft={deadZoneTimeLeft}
              onToggleDeadZone={handleToggleDeadZone}
              onTriggerSOS={handleSOS}
              onEndProtection={() => {
                setIsGuardianActive(false);
                setIsDeadZoneActive(false);
                setIsGuardianSheetOpen(false);
              }}
              onClose={() => setIsGuardianSheetOpen(false)}
            />
          )
        ) : isGuardianActive ? (
          <GuardianProtectionPanel
            visible={isGuardianActive}
            isDeadZoneActive={isDeadZoneActive}
            timeLeft={deadZoneTimeLeft}
            onToggleDeadZone={handleToggleDeadZone}
            onTriggerSOS={handleSOS}
            onEndProtection={() => {
              setIsGuardianActive(false);
              setIsDeadZoneActive(false);
            }}
          />
        ) : (
          <RouteComparisonPanel
            visible={!!destination}
            selectedRoute={selectedRouteType}
            onSelectRoute={handleSelectRoute}
            onStartNavigation={handleStartNavigation}
            routeStats={routeStats}
            viaSummary="Safe havens & protected areas"
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sosBackground: { backgroundColor: "rgba(255,0,0,0.4)" },

  // Updated Dynamic Autocomplete Layout
  searchContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    zIndex: 999,
    elevation: 999,
  },
  searchRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  textInputContainer: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    borderBottomWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: colors.card,
    height: 48,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listView: {
    position: "absolute", // CRITICAL: Makes the list float instead of expanding the row container
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchRow: {
    padding: 14,
    height: 50,
    backgroundColor: colors.card,
  },
  searchDescription: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  clearBtn: {
    marginLeft: 10,
    backgroundColor: colors.card,
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: { color: colors.textPrimary, fontWeight: "600" },

  // Bottom Icon Toolbar Styles
  sheetBackground: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbarContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  toolbarItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    minWidth: 75,
  },
  activeTab: {
    backgroundColor: "rgba(255, 138, 61, 0.12)",
    borderRadius: 12,
  },
  activeToolbarItem: {
    backgroundColor: "rgba(255, 138, 61, 0.12)",
    borderRadius: 12,
  },
  toolbarIcon: { fontSize: 24, marginBottom: 1 },
  toolbarLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: "600",
  },
  customizeIconPreview: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  customizeIconDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  customizeIconImage: {
    width: 20,
    height: 20,
  },
  recenterButton: {
    position: "absolute",
    bottom: 280,
    right: 16,
    backgroundColor: colors.card,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  selectDestinationButton: {
    bottom: 215,
  },
  selectDestinationActive: {
    backgroundColor: "#FF7A1A",
    borderColor: "#FF7A1A",
  },
  destinationButtonIcon: {
    width: 32,
    height: 32,
  },
  guardianFab: {
    position: "absolute",
    bottom: 230,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: "rgba(46, 204, 113, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 31,
  },
  guardianFabActive: {
    backgroundColor: colors.neonGreen,
    borderColor: colors.neonGreen,
  },
});

export default HomeScreen;
