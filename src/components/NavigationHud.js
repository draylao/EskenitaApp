import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../theme/colors";
import Straight from "../../assets/images/direction arrow/Straight.png";
import Left from "../../assets/images/direction arrow/Turn Left.png";
import Right from "../../assets/images/direction arrow/Turn Right.png";

const MANEUVER_ICON_MAP = {
  
  "turn-left": Left,
  "turn-right": Right,
  "defaultIcon": Straight,
  straight: Straight,
};

const getManeuverIcon = (maneuver) => MANEUVER_ICON_MAP[maneuver] || Straight;

const stripHtml = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatDistance = (meters) => {
  if (meters == null) return "--";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatEtaTime = (seconds) => {
  const eta = new Date(Date.now() + seconds * 1000);
  return eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDurationLabel = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
};

const NavigationHud = ({
  visible,
  currentStep,
  nextStepPreview,
  totalDistanceRemaining,
  totalDurationRemaining,
  speedKmh = 0,
  onExit,
}) => {
  if (!visible) return null;

  const instruction = stripHtml(currentStep?.html_instructions) || "Continue straight";
  const maneuverIcon = getManeuverIcon(currentStep?.maneuver);

  return (
    <>
      <View style={styles.topBanner}>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <X size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.maneuverIconWrap}>
          <Image
            source={maneuverIcon}
            style={{
              width: 70,
              height: 70,
            }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.instructionTextWrap}>
          <Text style={styles.distanceText}>
            {formatDistance(currentStep?.distance?.value)}
          </Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {instruction}
          </Text>
        </View>
      </View>

      {nextStepPreview && (
        <View style={styles.nextStepPill}>
          <Text style={styles.nextStepLabel}>Then</Text>
          <Text style={styles.nextStepText} numberOfLines={1}>
            {stripHtml(nextStepPreview.html_instructions)}
          </Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.etaRow}>
          <Text style={styles.etaDuration}>
            {formatDurationLabel(totalDurationRemaining)}
          </Text>
          <View style={styles.etaDivider} />
          <Text style={styles.etaTime}>{formatEtaTime(totalDurationRemaining)}</Text>
          <View style={styles.etaDivider} />
          <Text style={styles.etaDistance}>
            {formatDistance(totalDistanceRemaining)}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  topBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0E0C0A",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    zIndex: 30,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  exitBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 31,
  },
  maneuverIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionTextWrap: {
    flex: 1,
    paddingRight: 36,
  },
  distanceText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  instructionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  nextStepPill: {
    position: "absolute",
    top: 134,
    left: 16,
    right: 70,
    backgroundColor: "rgba(14, 12, 10, 0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 29,
  },
  nextStepLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  nextStepText: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  speedPill: {
    position: "absolute",
    bottom: 110,
    left: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0E0C0A",
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  speedValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  speedUnit: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  etaDuration: {
    color: colors.neonGreen,
    fontSize: 16,
    fontWeight: "800",
  },
  etaTime: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  etaDistance: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  etaDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    width: "35%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default NavigationHud;