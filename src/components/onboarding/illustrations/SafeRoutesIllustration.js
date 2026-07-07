import React from "react";
import { View, StyleSheet } from "react-native";
import { Svg, Path, Circle, Rect, Defs, LinearGradient, Stop } from "react-native-svg";

const SafeRoutesIllustration = ({ colors }) => {
  return (
    <View style={styles.container}>
      <Svg width="320" height="280" viewBox="0 0 320 280">
        <Defs>
          <LinearGradient id="safeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.routeSafe} stopOpacity="0.7" />
            <Stop offset="100%" stopColor={colors.routeSafeLight} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {/* Map background */}
        <Rect x="20" y="20" width="280" height="200" rx="12" fill={colors.surface} stroke={colors.border} strokeWidth="2" />

        {/* Safe route path */}
        <Path
          d="M 50 180 Q 100 160 150 140 T 250 80"
          stroke={colors.routeSafe}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Hazard markers (X) */}
        <Path d="M 100 120 L 110 130 M 110 120 L 100 130" stroke={colors.neonRed} strokeWidth="3" strokeLinecap="round" />
        <Path d="M 180 100 L 190 110 M 190 100 L 180 110" stroke={colors.neonRed} strokeWidth="3" strokeLinecap="round" />

        {/* Safe Haven pins */}
        <Circle cx="150" cy="140" r="10" fill={colors.primary} />
        <Path d="M 150 130 L 150 150 M 140 140 L 160 140" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        <Circle cx="250" cy="80" r="8" fill={colors.neonGreen} />
        <Path d="M 250 74 L 250 86 M 244 80 L 256 80" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Police station icon */}
        <Rect x="60" y="60" width="24" height="24" rx="4" fill={colors.neonRed} opacity={0.8} />
        <Circle cx="72" cy="72" r="6" fill="#FFFFFF" />

        {/* Hospital icon */}
        <Rect x="220" y="160" width="24" height="24" rx="4" fill={colors.neonRed} opacity={0.8} />
        <Path d="M 232 166 L 232 178 M 226 172 L 238 172" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Route guidance arrow */}
        <Path
          d="M 200 100 L 220 90 L 220 110 Z"
          fill={colors.routeSafe}
          opacity={0.8}
        >
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
        </Path>

        {/* Shield icon */}
        <Path
          d="M 160 40 Q 160 30 170 30 Q 180 30 180 40 L 180 60 Q 170 70 160 60 Z"
          fill={colors.primary}
          opacity={0.6}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
});

export default SafeRoutesIllustration;
