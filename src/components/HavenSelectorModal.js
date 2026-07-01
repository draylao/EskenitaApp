import { useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, ChevronRight, Clock, Compass, ShieldCheck, Star, Users } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
};

const toRad = (value) => (value * Math.PI) / 180;

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingBottom: 36,
      paddingHorizontal: 10,
      maxHeight: "82%",
    },
    dragHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border || "#33363D",
      marginBottom: 18,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
    },
    carouselContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },
    arrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    carousel: {
      flex: 1,
    },
    carouselContent: {
      paddingHorizontal: 8,
    },
    havenCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    selectedCard: {
      borderColor: colors.primary,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    safeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(52, 209, 122, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(52, 209, 122, 0.22)",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 20,
    },
    safeBadgeText: {
      color: colors.neonGreen,
      fontSize: 11,
      fontWeight: "700",
    },
    recommendedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    recommendedText: {
      color: "#1A1100",
      fontSize: 10,
      fontWeight: "700",
    },
    havenName: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 3,
      lineHeight: 23,
    },
    havenDescription: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 2,
    },
    distanceText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 16,
    },
    infoBoxes: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
      gap: 8,
    },
    infoBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 6,
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoBoxValue: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    infoBoxLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      textAlign: "center",
    },
    statusBar: {
      backgroundColor: "rgba(52, 209, 122, 0.12)",
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      borderWidth: 1,
      borderColor: "rgba(52, 209, 122, 0.22)",
    },
    statusDotGreen: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.neonGreen,
      marginRight: 7,
    },
    statusText: {
      color: colors.neonGreen,
      fontSize: 13,
      fontWeight: "700",
      marginRight: 6,
    },
    statusDetail: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    selectBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    btnIcon: {
      marginRight: 7,
    },
    selectBtnText: {
      color: "#1A1100",
      fontSize: 15,
      fontWeight: "700",
    },
    dotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border || "#2C2F37",
    },
    activeDot: {
      backgroundColor: colors.primary,
      width: 20,
    },
  });

const HavenSelectorModal = ({ visible, onClose, havens, userLocation, onSelectHaven }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const CARD_WIDTH = 300;
  const CARD_GAP = 16;
  const STEP = CARD_WIDTH + CARD_GAP;

  if (!havens || havens.length === 0) return null;
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) return null;

  const havensWithDistance = havens.map((haven) => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      haven.latlng.latitude,
      haven.latlng.longitude
    );
    return { ...haven, distance };
  });

  const sortedHavens = [...havensWithDistance].sort((a, b) => a.distance - b.distance);

  const scrollToIndex = (index) => {
    if (scrollViewRef.current && typeof scrollViewRef.current.scrollTo === "function") {
      scrollViewRef.current.scrollTo({ x: index * STEP, y: 0, animated: true });
    }
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => {
      const next = prev > 0 ? prev - 1 : sortedHavens.length - 1;
      scrollToIndex(next);
      return next;
    });
  };

  const handleNext = () => {
    setSelectedIndex((prev) => {
      const next = prev < sortedHavens.length - 1 ? prev + 1 : 0;
      scrollToIndex(next);
      return next;
    });
  };

  const handleSelect = (haven) => {
    onSelectHaven(haven);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select Safe Haven</Text>
              <Text style={styles.subtitle}>
                {sortedHavens.length} nearby · sorted by distance
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.carouselContainer}>
            <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevious}>
              <ChevronLeft size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / STEP);
                setSelectedIndex(index);
              }}
            >
              {sortedHavens.map((haven, index) => (
                <TouchableOpacity
                  key={haven.id}
                  activeOpacity={0.9}
                  style={[
                    styles.havenCard,
                    { width: CARD_WIDTH, marginRight: CARD_GAP },
                    index === selectedIndex && styles.selectedCard,
                  ]}
                  onPress={() => handleSelect(haven)}
                >
                  <View style={styles.topRow}>
                    <View style={styles.safeBadge}>
                      <ShieldCheck size={12} color={colors.neonGreen} />
                      <Text style={styles.safeBadgeText}>Safe haven</Text>
                    </View>
                    {index === 0 && (
                      <View style={styles.recommendedBadge}>
                        <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.recommendedText}>Closest</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.havenName} numberOfLines={2}>
                    {haven.title}
                  </Text>
                  <Text style={styles.havenDescription}>
                    Welcoming & well-lit · Staff present
                  </Text>
                  <Text style={styles.distanceText}>
                    {formatDistance(haven.distance)} away
                  </Text>

                  <View style={styles.infoBoxes}>
                    <View style={styles.infoBox}>
                      <Clock size={17} color={colors.primary} />
                      <Text style={styles.infoBoxValue}>24/7</Text>
                      <Text style={styles.infoBoxLabel}>Open</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Star size={17} color={colors.primary} />
                      <Text style={styles.infoBoxValue}>{haven.rating || "9.1"}</Text>
                      <Text style={styles.infoBoxLabel}>Safety score</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Users size={17} color={colors.primary} />
                      <Text style={styles.infoBoxValue}>
                        {Math.floor(Math.random() * 50) + 10}
                      </Text>
                      <Text style={styles.infoBoxLabel}>Visits tonight</Text>
                    </View>
                  </View>

                  <View style={styles.statusBar}>
                    <View style={styles.statusDotGreen} />
                    <Text style={styles.statusText}>Open now</Text>
                    <Text style={styles.statusDetail}>Staff on site · Always welcoming</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => handleSelect(haven)}
                  >
                    <Compass size={17} color="#1A1100" style={styles.btnIcon} />
                    <Text style={styles.selectBtnText}>Head to this haven</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.arrowBtn} onPress={handleNext}>
              <ChevronRight size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dotsContainer}>
            {sortedHavens.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === selectedIndex && styles.activeDot]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HavenSelectorModal;