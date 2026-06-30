import {
  ChevronDown,
  Lock,
  ShieldCheck,
  TimerReset,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "--";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
};

const formatDistance = (km) => {
  if (!km && km !== 0) return "--";
  return `${km.toFixed(1)} km`;
};

const RouteComparisonPanel = ({
  visible,
  selectedRoute,
  onSelectRoute,
  onStartNavigation,
  routeStats = {},
  viaSummary = "Via safe havens",
  guardianStatus = null,
}) => {
  const [viewMode, setViewMode] = useState("map");

  if (!visible) return null;

  // Added Alternative Safe Route definition to the routes map
  const routes = [
    {
      id: "safe",
      label: "Safe Route",
      color: colors.neonGreen,
      selectable: true,
      stats: routeStats.safe,
    },
    {
      id: "safeAlt",
      label: "Alt Safe Route",
      color: "#17A2B8", // Cyan indicator color
      selectable: true,
      stats: routeStats.safeAlt,
    },
    {
      id: "dangerous",
      label: "Fastest Route",
      color: colors.accent,
      selectable: false,
      stats: routeStats.dangerous,
    },
  ];

  const handleRoutePress = (route) => {
    if (!route.selectable) {
      Alert.alert(
        "Route Blocked",
        "This route passes through danger zones and is not available. Please use a safe route.",
        [{ text: "OK" }],
      );
      return;
    }
    onSelectRoute(route.id);
  };

  const handleStart = () => {
    // Allows either safe route choice to proceed forward seamlessly
    if (selectedRoute !== "safe" && selectedRoute !== "safeAlt") {
      Alert.alert(
        "Safe Route Required",
        "Only a safe route can be used for navigation.",
        [{ text: "OK", onPress: () => onSelectRoute("safe") }],
      );
      return;
    }
    onStartNavigation();
  };

  return (
    <View style={styles.container}>
      {guardianStatus && (
        <View
          style={[
            styles.statusRow,
            guardianStatus.type === "deadzone" && styles.statusRowAlert,
          ]}
        >
          {guardianStatus.type === "deadzone" ? (
            <TimerReset size={15} color={colors.neonRed} />
          ) : (
            <ShieldCheck size={15} color={colors.neonGreen} />
          )}
          <Text
            style={[
              styles.statusText,
              guardianStatus.type === "deadzone" && styles.statusTextAlert,
            ]}
            numberOfLines={1}
          >
            {guardianStatus.type === "deadzone"
              ? `Check-in needed · ${guardianStatus.timeLeft || ""}`
              : "Digital Kasama Active"}
          </Text>
          {guardianStatus.onCancel && (
            <TouchableOpacity
              onPress={guardianStatus.onCancel}
              style={styles.statusCancelBtn}
            >
              <Text style={styles.statusCancelText}>
                {guardianStatus.type === "deadzone" ? "I'm Safe" : "Stop"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, viewMode === "list" && styles.tabActive]}
          onPress={() => setViewMode("list")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "list" && styles.tabTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "map" && styles.tabActive]}
          onPress={() => setViewMode("map")}
        >
          <Text
            style={[styles.tabText, viewMode === "map" && styles.tabTextActive]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "list" ? (
        <View style={styles.listView}>
          {routes.map((route) => {
            const isSelected = selectedRoute === route.id;
            const isBlocked = !route.selectable;

            return (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.listItem,
                  isSelected && styles.listItemSelected,
                  isBlocked && styles.listItemBlocked,
                ]}
                onPress={() => handleRoutePress(route)}
                activeOpacity={isBlocked ? 1 : 0.7}
              >
                <View
                  style={[
                    styles.listIndicator,
                    { backgroundColor: route.color },
                  ]}
                />
                <View style={styles.listItemContent}>
                  <View style={styles.listItemHeader}>
                    <Text
                      style={[
                        styles.listItemTitle,
                        !isSelected && styles.listItemTitleUnselected,
                      ]}
                    >
                      {route.label}
                    </Text>
                    {isBlocked && (
                      <Lock
                        size={14}
                        color={isSelected ? colors.textSecondary : "#FFFFFF"}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.listItemStats,
                      !isSelected && styles.listItemStatsUnselected,
                    ]}
                  >
                    {formatDuration(route.stats?.duration)} ·{" "}
                    {formatDistance(route.stats?.distance)}
                  </Text>
                  {isBlocked && (
                    <Text
                      style={[
                        styles.blockedLabel,
                        !isSelected && styles.blockedLabelUnselected,
                      ]}
                    >
                      Blocked — danger zones
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.routeCardsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeCardsContent}
          >
            {routes.map((route) => {
              const isSelected = selectedRoute === route.id;
              const isBlocked = !route.selectable;

              return (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeCard,
                    isSelected && styles.routeCardSelected,
                    isBlocked && styles.routeCardBlocked,
                  ]}
                  onPress={() => handleRoutePress(route)}
                  activeOpacity={isBlocked ? 1 : 0.7}
                >
                  {isBlocked && (
                    <View style={styles.lockBadge}>
                      <Lock size={10} color="#FFFFFF" />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.routeDuration,
                      isSelected && styles.routeDurationSelected,
                      isBlocked && styles.routeDurationBlocked,
                    ]}
                  >
                    {formatDuration(route.stats?.duration)}
                  </Text>
                  <Text
                    style={[
                      styles.routeDistance,
                      isSelected && styles.routeDistanceSelected,
                      isBlocked && styles.routeDistanceBlocked,
                    ]}
                  >
                    {formatDistance(route.stats?.distance)}
                  </Text>
                  {isSelected && (
                    <View
                      style={[
                        styles.selectedIndicator,
                        { backgroundColor: route.color },
                      ]}
                    >
                      <ChevronDown size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.viaBar}>
        <Text style={styles.viaText} numberOfLines={1}>
          Vía: {viaSummary}
        </Text>
        <ShieldCheck
          size={16}
          color={colors.primary}
          style={{ marginLeft: 8 }}
        />
      </View>

      <TouchableOpacity style={styles.goButton} onPress={handleStart}>
        <Text style={styles.goButtonText}>GO</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    zIndex: 15,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 204, 113, 0.35)",
  },
  statusRowAlert: {
    borderBottomColor: "rgba(255, 82, 82, 0.4)",
  },
  statusText: {
    flex: 1,
    color: colors.neonGreen,
    fontSize: 13,
    fontWeight: "700",
  },
  statusTextAlert: {
    color: colors.neonRed,
  },
  statusCancelBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusCancelText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.primary,
  },
  listView: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  listItem: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemSelected: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
  },
  listItemBlocked: {
    opacity: 0.55,
  },
  listIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  listItemTitleUnselected: {
    color: colors.textPrimary,
  },
  listItemStats: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listItemStatsUnselected: {
    color: colors.textSecondary,
  },
  blockedLabel: {
    fontSize: 12,
    color: colors.neonRed,
    marginTop: 4,
    fontWeight: "500",
  },
  blockedLabelUnselected: {
    color: colors.neonRed,
  },
  routeCardsRow: {
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingBottom: 4,
  },
  routeCardsContent: {
    paddingHorizontal: 8,
    gap: 4,
    flexDirection: "row",
  },
  routeCard: {
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    position: "relative",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeCardSelected: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 14,
  },
  routeCardBlocked: {
    opacity: 0.5,
  },
  lockBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    padding: 2,
  },
  routeDuration: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  routeDurationSelected: {
    color: colors.primary,
  },
  routeDurationBlocked: {
    color: colors.textSecondary,
  },
  routeDistance: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  routeDistanceSelected: {
    color: colors.textSecondary,
  },
  routeDistanceBlocked: {
    color: colors.textSecondary,
  },
  selectedIndicator: {
    position: "absolute",
    bottom: -1,
    width: 28,
    height: 14,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viaBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viaText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  goButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  goButtonText: {
    color: "#15120F",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
});

export default RouteComparisonPanel;
