import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Svg, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

// Percentage sizes collapse to 0 through react-native-svg's web wrapper, so
// use explicit dimensions matching the slide's illustration slot (viewBox
// keeps the drawing scaled)
const ILLU_WIDTH = Platform.OS === "web" ? 206 : 274;
const ILLU_HEIGHT = Platform.OS === "web" ? 180 : 240;

const WelcomeIllustration = ({ colors }) => {
  return (
    <View style={styles.container}>
      <Svg width={ILLU_WIDTH} height={ILLU_HEIGHT} viewBox="0 0 320 280">
        <Defs>
          <LinearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.routeSafe} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Background glow */}
        <Circle cx="160" cy="140" r="120" fill="url(#skyGradient)" opacity={0.5} />

        {/* Walking path */}
        <Path
          d="M 40 220 Q 80 200 120 180 T 200 140 T 280 100"
          stroke={colors.routeSafe}
          strokeWidth="4"
          fill="none"
          strokeDasharray="8 4"
          opacity={0.6}
        />

        {/* Person silhouette */}
        <Circle cx="200" cy="130" r="12" fill={colors.textPrimary} />
        <Path
          d="M 200 145 L 200 180 L 185 220 L 195 220 L 205 185 L 205 220 L 215 220 L 205 180 Z"
          fill={colors.textPrimary}
        />

        {/* Guide light/glow */}
        <Circle cx="240" cy="90" r="8" fill={colors.primary} opacity={0.8}>
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </Circle>

        {/* Stars/sparkles */}
        <Circle cx="80" cy="60" r="3" fill={colors.primary} opacity={0.6} />
        <Circle cx="120" cy="40" r="2" fill={colors.accent} opacity={0.5} />
        <Circle cx="260" cy="50" r="2.5" fill={colors.primary} opacity={0.4} />
        <Circle cx="40" cy="100" r="2" fill={colors.accent} opacity={0.5} />

        {/* Ground line */}
        <Path d="M 20 240 Q 160 235 300 240" stroke={colors.border} strokeWidth="2" fill="none" opacity={0.3} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default WelcomeIllustration;
