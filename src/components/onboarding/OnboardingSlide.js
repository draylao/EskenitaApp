import React from "react";
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import CommunityIllustration from "./illustrations/CommunityIllustration";
import ConnectedIllustration from "./illustrations/ConnectedIllustration";
import SafeRoutesIllustration from "./illustrations/SafeRoutesIllustration";
import WelcomeIllustration from "./illustrations/WelcomeIllustration";

const OnboardingSlide = ({
  screen,
  index,
  onNext,
  onSkip,
  isLastSlide,
  currentIndex,
}) => {
  const { colors } = useTheme();

  const renderIllustration = () => {
    switch (screen.illustration) {
      case "welcome":
        return <WelcomeIllustration colors={colors} />;
      case "safe-routes":
        return <SafeRoutesIllustration colors={colors} />;
      case "connected":
        return <ConnectedIllustration colors={colors} />;
      case "community":
        return <CommunityIllustration colors={colors} />;
      default:
        return <WelcomeIllustration colors={colors} />;
    }
  };

  return (
    <View style={styles.slide}>
      {Platform.OS === "web" ? (
        <View style={styles.safeArea}>
          <View style={styles.content}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>{renderIllustration()}</View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={[styles.subtitle, { color: colors.primary }]}>{screen.subtitle}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{screen.title}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {screen.description}
              </Text>
              <Text style={[styles.brandLine, { color: colors.textSecondary, opacity: 0.7 }]}>
                {screen.brandLine}
              </Text>
            </View>

            {/* Page Indicators */}
            <View style={styles.indicatorContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: i === index ? colors.primary : colors.border,
                      width: i === index ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={onNext}
              >
                <Text style={styles.nextText}>{screen.cta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>{renderIllustration()}</View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={[styles.subtitle, { color: colors.primary }]}>{screen.subtitle}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{screen.title}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {screen.description}
              </Text>
              <Text style={[styles.brandLine, { color: colors.textSecondary, opacity: 0.7 }]}>
                {screen.brandLine}
              </Text>
            </View>

            {/* Page Indicators */}
            <View style={styles.indicatorContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: i === index ? colors.primary : colors.border,
                      width: i === index ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={onNext}
              >
                <Text style={styles.nextText}>{screen.cta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
 slide: {
  flex: 1,
  width: "100%",
  maxWidth: Platform.OS === "web" ? 450 : undefined,
  alignSelf: "center",
  height: Platform.OS === "web" ? "100vh" : undefined,   // was maxHeight: "200vh"
},
safeArea: {
  flex: 1,
},
content: {
  flex: 1,
  paddingHorizontal: 32,
  paddingTop: Platform.OS === "web" ? 20 : 40,
  paddingBottom: Platform.OS === "web" ? 20 : 40,
  justifyContent: "center",   // back to center, this was fine
  alignItems: "center",
  height: Platform.OS === "web" ? "100%" : undefined,   // was maxHeight: "100vh"
},
   illustrationContainer: {
  // No `flex: 0` here — on web it becomes flex-basis: 0% and overrides
  // the fixed height, collapsing the illustration to zero
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  height: Platform.OS === "web" ? 180 : 240,
  flexShrink: 0,
  overflow: "hidden",
},
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  brandLine: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
});

export default OnboardingSlide;
