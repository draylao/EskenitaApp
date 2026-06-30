import * as Clipboard from "expo-clipboard";
import {
  Check,
  Copy,
  Link2,
  ShieldCheck,
  Siren,
  TimerReset,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const GuardianProtectionPanel = ({
  visible,
  guardianName = "Maria A.",
  isDeadZoneActive,
  timeLeft = 240,
  shareLink = "https://guardian.app/track/8f3a2c",
  onToggleDeadZone,
  onTriggerSOS,
  onEndProtection,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!visible) return null;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // no-op: clipboard write failed silently
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldBadge}>
            <ShieldCheck size={18} color={colors.neonGreen} />
          </View>
          <View>
            <Text style={styles.headerTitle}>You're protected</Text>
            <Text style={styles.headerSubtitle}>
              {guardianName} is watching your journey
            </Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>Your guardian</Text>
      <View style={styles.guardianCard}>
        <View style={styles.guardianAvatar}>
          <Text style={styles.guardianAvatarText}>
            {guardianName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.guardianInfo}>
          <Text style={styles.guardianName}>{guardianName}</Text>
          <Text style={styles.guardianStatus}>
            Following your route · Updates every 30s
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Share live location</Text>
      <View style={styles.linkCard}>
        <View style={styles.linkLeft}>
          <View style={styles.linkIconBadge}>
            <Link2 size={16} color={colors.textSecondary} />
          </View>
          <Text
            style={styles.linkText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {shareLink}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnActive]}
          onPress={handleCopyLink}
        >
          {copied ? (
            <Check size={14} color={colors.neonGreen} />
          ) : (
            <Copy size={14} color={colors.textPrimary} />
          )}
          <Text
            style={[styles.copyBtnText, copied && styles.copyBtnTextActive]}
          >
            {copied ? "Copied" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Safety check-in</Text>
      <View
        style={[
          styles.checkinCard,
          isDeadZoneActive && styles.checkinCardActive,
        ]}
      >
        <View style={styles.checkinRow}>
          <View style={styles.checkinLeft}>
            <View
              style={[
                styles.checkinIconBadge,
                isDeadZoneActive && styles.checkinIconBadgeActive,
              ]}
            >
              <TimerReset
                size={16}
                color={
                  isDeadZoneActive ? colors.neonOrange : colors.textSecondary
                }
              />
            </View>
            <View style={styles.checkinTextWrap}>
              <Text style={styles.checkinTitle}>Check-in reminder</Text>
              <Text style={styles.checkinSubtitle}>
                {isDeadZoneActive
                  ? "Maria gets alert if you don't respond"
                  : "Turn on to auto-alert Maria if you go quiet"}
              </Text>
            </View>
          </View>
          {isDeadZoneActive ? (
            <Text style={styles.checkinTimer}>{formatTime(timeLeft)}</Text>
          ) : (
            <Switch
              value={isDeadZoneActive}
              onValueChange={onToggleDeadZone}
              trackColor={{
                false: colors.surfaceLight,
                true: "rgba(255, 138, 61, 0.45)",
              }}
              thumbColor={
                isDeadZoneActive ? colors.neonOrange : colors.textSecondary
              }
            />
          )}
        </View>

        {isDeadZoneActive && (
          <View style={styles.checkinActions}>
            <TouchableOpacity
              style={styles.imSafeBtn}
              onPress={() => onToggleDeadZone(false)}
            >
              <ShieldCheck size={15} color="#15120F" />
              <Text style={styles.imSafeText}>I am Safe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosBtn} onPress={onTriggerSOS}>
              <Siren size={15} color={colors.neonRed} />
              <Text style={styles.sosText}>Test SOS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={onEndProtection}>
        <X size={16} color={colors.textPrimary} />
        <Text style={styles.endBtnText}>End protection</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 90,
      left: 0,
      right: 0,
      zIndex: 15,
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderBottomWidth: 0,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dismissBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceLight,
      alignItems: "center",
      justifyContent: "center",
    },
    shieldBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "rgba(46, 204, 113, 0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.neonGreen,
      fontSize: 12,
      marginTop: 1,
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    guardianCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "rgba(46, 204, 113, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(46, 204, 113, 0.3)",
      borderRadius: 14,
      padding: 12,
    },
    guardianAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.neonGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    guardianAvatarText: {
      color: "#15120F",
      fontWeight: "800",
      fontSize: 14,
    },
    guardianInfo: {
      flex: 1,
    },
    guardianName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    guardianStatus: {
      color: colors.neonGreen,
      fontSize: 12,
      marginTop: 2,
    },
    linkCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 10,
      paddingLeft: 12,
    },
    linkLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    linkIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: colors.surfaceLight,
      alignItems: "center",
      justifyContent: "center",
    },
    linkText: {
      color: colors.textSecondary,
      fontSize: 12,
      flexShrink: 1,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceLight,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    copyBtnActive: {
      backgroundColor: "rgba(46, 204, 113, 0.15)",
    },
    copyBtnText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 12,
    },
    copyBtnTextActive: {
      color: colors.neonGreen,
    },
    checkinCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    checkinCardActive: {
      backgroundColor: "rgba(255, 138, 61, 0.06)",
      borderColor: "rgba(255, 138, 61, 0.5)",
    },
    checkinRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    checkinLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    checkinIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceLight,
      alignItems: "center",
      justifyContent: "center",
    },
    checkinIconBadgeActive: {
      backgroundColor: "rgba(255, 138, 61, 0.15)",
    },
    checkinTextWrap: {
      flex: 1,
    },
    checkinTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    checkinSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    checkinTimer: {
      color: colors.neonOrange,
      fontSize: 22,
      fontWeight: "800",
    },
    checkinActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    imSafeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.neonGreen,
      paddingVertical: 10,
      borderRadius: 24,
    },
    imSafeText: {
      color: "#15120F",
      fontWeight: "700",
      fontSize: 13,
    },
    sosBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.neonRed,
      paddingVertical: 10,
      borderRadius: 24,
    },
    sosText: {
      color: colors.neonRed,
      fontWeight: "700",
      fontSize: 13,
    },
    endBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surfaceLight,
      paddingVertical: 14,
      borderRadius: 24,
      marginTop: 2,
    },
    endBtnText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 14,
    },
  });

export default GuardianProtectionPanel;
