import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { Link, Timer, TriangleAlert } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DeadManSwitchTimer from "../components/DeadManSwitchTimer";
import GuardianBanner from "../components/GuardianBanner";
import MapViewComponent from "../components/MapViewComponents";
import ThreatReportModal from "../components/ThreatReportModal";
import { analyzeThreatWithAI } from "../services/MockVertexAi";
import { colors } from "../theme/colors";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const HomeScreen = () => {
  const [threatPins, setThreatPins] = useState([]);
  const [destination, setDestination] = useState(null);

  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isDeadZoneActive, setIsDeadZoneActive] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSosTriggered, setIsSosTriggered] = useState(false);

  const bottomSheetRef = useRef(null);
  const insets = useSafeAreaInsets();
  const googlePlacesRef = useRef(null);

  const snapPoints = useMemo(() => {
    return [insets.bottom > 0 ? "12%" : "10%"];
  }, [insets.bottom]);

  const [userLocation, setUserLocation] = useState({
    latitude: 15.4828,
    longitude: 120.9749,
  });

  const handleSetDestination = () => {
    setDestination({ latitude: 15.4716, longitude: 120.9822 });
  };

  const handleClearRoute = () => {
    setDestination(null);
    googlePlacesRef.current?.setAddressText("");
  };

  const handleShareGuardian = () => {
    Alert.alert("Link Copied!", "Live location link copied to clipboard.");
    setIsGuardianActive(true);
  };

  const handleReportThreat = async (description) => {
    const aiResult = await analyzeThreatWithAI(description);
    setThreatPins((prev) => [...prev, aiResult]);
    setIsModalVisible(false);
  };

  const handleSOS = () => {
    setIsDeadZoneActive(false);
    setIsSosTriggered(true);
    Alert.alert("CRITICAL", "Siren & Offline SMS triggered!", [
      { text: "Dismiss", onPress: () => setIsSosTriggered(false) },
    ]);
  };

  useEffect(() => {
    let locationSubscription;

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
          accuracy: Location.Accuracy.High,
          distanceInterval: 2, // Updates every 2 meters
          timeInterval: 2000, // Or every 2 seconds
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        },
      );
    };

    startTracking();

    // Clean up subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isSosTriggered && styles.sosBackground]}>
        <MapViewComponent
          threatPins={threatPins}
          destination={destination}
          userLocation={userLocation}
        />

        {/* Minimal Search Bar */}
        <View style={styles.searchContainer}>
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
              location: `${userLocation.latitude},${userLocation.longitude}`,
              radius: "20000", // Favors local results near the user
            }}
            styles={{
              container: { flex: 1 },
              textInputContainer: styles.textInputContainer,
              textInput: styles.textInput,
              listView: styles.listView,
              row: styles.searchRow,
              description: styles.searchDescription,
            }}
            enablePoweredByContainer={false}
          />
          {destination && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearRoute}
            >
              <Text style={styles.clearText}>✖</Text>
            </TouchableOpacity>
          )}
        </View>

        <GuardianBanner
          isActive={isGuardianActive && !isDeadZoneActive}
          onCancel={() => setIsGuardianActive(false)}
        />

        {/* Modern Toolbar Component on Bottom Layer */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={{ display: "none" }} // Completely flat minimalist design
        >
          <BottomSheetView
            style={[
              styles.toolbarContent,
              { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
            ]}
          >
            {/* Action Item 1 */}
            <TouchableOpacity
              style={styles.toolbarItem}
              onPress={() => setIsModalVisible(true)}
            >
              <TriangleAlert
                size={22}
                color="#333"
                style={styles.toolbarIcon}
              />
              <Text style={styles.toolbarLabel}>Report</Text>
            </TouchableOpacity>

            {/* Action Item 2 */}
            <TouchableOpacity
              style={styles.toolbarItem}
              onPress={handleShareGuardian}
            >
              <Link size={22} color="#333" style={styles.toolbarIcon} />
              <Text style={styles.toolbarLabel}>Share Link</Text>
            </TouchableOpacity>

            {/* Action Item 3 - Dead Man Switch Toggle */}
            <TouchableOpacity
              style={[
                styles.toolbarItem,
                isDeadZoneActive && styles.activeToolbarItem,
              ]}
              onPress={() => setIsDeadZoneActive(!isDeadZoneActive)}
            >
              <Timer
                size={22}
                color={isDeadZoneActive ? "#EF4444" : "#333"}
                style={styles.toolbarIcon}
              />
              <Text style={styles.toolbarLabel}>Dead Zone</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>

        {isDeadZoneActive && (
          <View style={styles.timerOverlayContainer}>
            <DeadManSwitchTimer
              isActive={isDeadZoneActive}
              onActivate={() => setIsDeadZoneActive(true)}
              onCancel={() => setIsDeadZoneActive(false)}
              onTriggerSOS={handleSOS}
            />
          </View>
        )}

        <ThreatReportModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onSubmit={handleReportThreat}
        />
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
    flexDirection: "row",
    alignItems: "flex-start", // Allows dropdown to spread downward naturally
    zIndex: 999, // Needs to clear everything on the map viewport
    elevation: 999,
  },
  textInputContainer: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    borderBottomWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#666",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listView: {
    position: "absolute", // CRITICAL: Makes the list float instead of expanding the row container
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  searchRow: {
    padding: 14,
    height: 50,
  },
  searchDescription: {
    color: "#333",
    fontSize: 14,
  },
  clearBtn: {
    marginLeft: 10,
    backgroundColor: "#FFFFFF",
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  clearText: { color: "#333", fontWeight: "bold" },

  // Bottom Icon Toolbar Styles
  sheetBackground: {
    backgroundColor: "rgba(245, 245, 247, 0.94)", // Premium glassmorphism layout
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    width: 55,
  },
  activeToolbarItem: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 12,
  },
  toolbarIcon: { fontSize: 24, marginBottom: 1 },
  toolbarLabel: { fontSize: 10, color: "#333", fontWeight: "500" },
  timerOverlayContainer: {
    position: "absolute",
    bottom: 120, // Adjusted for smaller toolbar height
    left: 16,
    right: 16,
    zIndex: 20, // Places it cleanly over the map canvas layer
  },
});

export default HomeScreen;
