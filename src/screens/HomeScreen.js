import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Link, Search, Timer, TriangleAlert } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DeadManSwitchTimer from "../components/DeadManSwitchTimer";
import GuardianBanner from "../components/GuardianBanner";
import MapViewComponent from "../components/MapViewComponents";
import ThreatReportModal from "../components/ThreatReportModal";
import { analyzeThreatWithAI } from "../services/MockVertexAi";
import { colors } from "../theme/colors";

const HomeScreen = () => {
  const [threatPins, setThreatPins] = useState([]);
  const [destination, setDestination] = useState(null);

  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isDeadZoneActive, setIsDeadZoneActive] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSosTriggered, setIsSosTriggered] = useState(false);

  const bottomSheetRef = useRef(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => {
    return [insets.bottom > 0 ? "12%" : "10%"];
  }, [insets.bottom]);

  const handleSetDestination = () => {
    setDestination({ latitude: 15.4716, longitude: 120.9822 });
  };

  const handleClearRoute = () => {
    setDestination(null);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isSosTriggered && styles.sosBackground]}>
        <MapViewComponent threatPins={threatPins} destination={destination} />

        {/* Minimal Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={handleSetDestination}
          >
            <Search size={18} color="#888" style={styles.searchIcon} />
            <Text style={styles.searchText}>
              {destination ? "Routing to Destination..." : "Search here"}
            </Text>
          </TouchableOpacity>
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

  // Custom Minimal Layout
  searchContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: { fontSize: 18, marginRight: 10, color: "#888" },
  searchText: { color: "#666", fontSize: 16 },
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
