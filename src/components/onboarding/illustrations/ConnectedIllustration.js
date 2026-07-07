import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Svg, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

// Percentage sizes collapse to 0 through react-native-svg's web wrapper
const ILLU_WIDTH = Platform.OS === "web" ? 206 : 274;
const ILLU_HEIGHT = Platform.OS === "web" ? 180 : 240;

const ConnectedIllustration = ({ colors }) => {
  return (
    <View style={styles.container}>
      <Svg width={ILLU_WIDTH} height={ILLU_HEIGHT} viewBox="0 0 320 280">
        <Defs>
          <LinearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.neonGreen} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.routeSafe} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>

        {/* Central user */}
        <Circle cx="160" cy="140" r="30" fill={colors.primary} />
        <Circle cx="160" cy="130" r="10" fill="#FFFFFF" />
        <Path d="M 160 145 L 160 165 L 145 185 L 155 185 L 160 170 L 160 185 L 165 185 L 160 165 Z" fill="#FFFFFF" />

        {/* Connection lines to contacts */}
        <Path
          d="M 160 140 L 80 80"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.5}
        />
        <Path
          d="M 160 140 L 240 80"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.5}
        />
        <Path
          d="M 160 140 L 80 200"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.5}
        />
        <Path
          d="M 160 140 L 240 200"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.5}
        />

        {/* Contact 1 - Top Left */}
        <Circle cx="80" cy="80" r="20" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="80" cy="74" r="6" fill="#FFFFFF" />
        <Path d="M 80 82 L 80 92 L 70 100 L 76 100 L 80 94 L 80 100 L 84 100 L 80 92 Z" fill="#FFFFFF" />

        {/* Contact 2 - Top Right */}
        <Circle cx="240" cy="80" r="20" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="240" cy="74" r="6" fill="#FFFFFF" />
        <Path d="M 240 82 L 240 92 L 230 100 L 236 100 L 240 94 L 240 100 L 244 100 L 240 92 Z" fill="#FFFFFF" />

        {/* Contact 3 - Bottom Left */}
        <Circle cx="80" cy="200" r="20" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="80" cy="194" r="6" fill="#FFFFFF" />
        <Path d="M 80 202 L 80 212 L 70 220 L 76 220 L 80 214 L 80 220 L 84 220 L 80 212 Z" fill="#FFFFFF" />

        {/* Contact 4 - Bottom Right */}
        <Circle cx="240" cy="200" r="20" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="240" cy="194" r="6" fill="#FFFFFF" />
        <Path d="M 240 202 L 240 212 L 230 220 L 236 220 L 240 214 L 240 220 L 244 220 L 240 212 Z" fill="#FFFFFF" />

        {/* Live location pulse */}
        <Circle cx="160" cy="140" r="40" fill="url(#pulseGradient)" opacity={0.3}>
          <animate attributeName="r" values="30;45;30" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
        </Circle>

        {/* Emergency button */}
        <Circle cx="280" cy="240" r="25" fill={colors.neonRed} opacity={0.9} />
        <Path d="M 280 230 L 280 250 M 270 240 L 290 240" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

        {/* Shield protection */}
        <Path
          d="M 40 240 Q 40 220 60 220 Q 80 220 80 240 L 80 260 Q 60 275 40 260 Z"
          fill={colors.primary}
          opacity={0.7}
        />
        <Circle cx="60" cy="245" r="8" fill="#FFFFFF" />
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

export default ConnectedIllustration;
