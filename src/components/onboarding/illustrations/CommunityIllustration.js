import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Circle, Defs, LinearGradient, Path, Rect, Stop, Svg } from "react-native-svg";

// Percentage sizes collapse to 0 through react-native-svg's web wrapper
const ILLU_WIDTH = Platform.OS === "web" ? 206 : 274;
const ILLU_HEIGHT = Platform.OS === "web" ? 180 : 240;

const CommunityIllustration = ({ colors }) => {
  return (
    <View style={styles.container}>
      <Svg width={ILLU_WIDTH} height={ILLU_HEIGHT} viewBox="0 0 320 280">
        <Defs>
          <LinearGradient id="communityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Community circle */}
        <Circle cx="160" cy="140" r="100" fill="url(#communityGradient)" opacity={0.3} />

        {/* Central community hub */}
        <Circle cx="160" cy="140" r="35" fill={colors.primary} />
        <Path
          d="M 160 115 L 160 125 M 160 155 L 160 165 M 135 140 L 145 140 M 175 140 L 185 140"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Community members */}
        <Circle cx="80" cy="100" r="18" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="80" cy="94" r="5" fill="#FFFFFF" />
        <Path d="M 80 102 L 80 112 L 72 120 L 78 120 L 80 116 L 80 120 L 82 120 L 80 112 Z" fill="#FFFFFF" />

        <Circle cx="240" cy="100" r="18" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="240" cy="94" r="5" fill="#FFFFFF" />
        <Path d="M 240 102 L 240 112 L 232 120 L 238 120 L 240 116 L 240 120 L 242 120 L 240 112 Z" fill="#FFFFFF" />

        <Circle cx="80" cy="180" r="18" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="80" cy="174" r="5" fill="#FFFFFF" />
        <Path d="M 80 182 L 80 192 L 72 200 L 78 200 L 80 196 L 80 200 L 82 200 L 80 192 Z" fill="#FFFFFF" />

        <Circle cx="240" cy="180" r="18" fill={colors.neonGreen} opacity={0.8} />
        <Circle cx="240" cy="174" r="5" fill="#FFFFFF" />
        <Path d="M 240 182 L 240 192 L 232 200 L 238 200 L 240 196 L 240 200 L 242 200 L 240 192 Z" fill="#FFFFFF" />

        {/* Connection lines */}
        <Path
          d="M 160 140 L 80 100"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="3 3"
          opacity={0.4}
        />
        <Path
          d="M 160 140 L 240 100"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="3 3"
          opacity={0.4}
        />
        <Path
          d="M 160 140 L 80 180"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="3 3"
          opacity={0.4}
        />
        <Path
          d="M 160 140 L 240 180"
          stroke={colors.primary}
          strokeWidth="2"
          strokeDasharray="3 3"
          opacity={0.4}
        />

        {/* Hazard report icon */}
        <Rect x="40" y="40" width="30" height="30" rx="6" fill={colors.neonRed} opacity={0.7} />
        <Path d="M 55 50 L 55 60 M 50 55 L 60 55" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Safety alert icon */}
        <Circle cx="280" cy="50" r="15" fill={colors.neonOrange} opacity={0.8} />
        <Path d="M 280 42 L 280 50 M 280 54 L 280 58" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* Report contribution arrows */}
        <Path
          d="M 70 70 Q 100 90 130 110"
          stroke={colors.primary}
          strokeWidth="2"
          fill="none"
          opacity={0.5}
          markerEnd="url(#arrowhead)"
        />

        {/* Heart/safety symbol */}
        <Path
          d="M 160 220 Q 160 210 170 210 Q 180 210 180 220 L 180 235 Q 170 245 160 235 Z"
          fill={colors.primary}
          opacity={0.6}
        />
        <Circle cx="170" cy="225" r="5" fill="#FFFFFF" />

        {/* Community pulse */}
        <Circle cx="160" cy="140" r="50" fill={colors.primary} opacity={0.1}>
          <animate attributeName="r" values="40;55;40" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.05;0.1" dur="2.5s" repeatCount="indefinite" />
        </Circle>
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

export default CommunityIllustration;
