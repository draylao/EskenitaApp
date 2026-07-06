import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import ShieldIcon from "./icons/ShieldIcon";
import AlertIcon from "./icons/AlertIcon";
import MapPinIcon from "./icons/MapPinIcon";

const MarkerDetailModal = ({ visible, onClose, marker, onGo }) => {
  if (!marker) return null;

  const getIcon = () => {
    switch (marker.type) {
      case "haven":
        return <ShieldIcon size={32} color={marker.color} />;
      case "threat":
        return <AlertIcon size={32} color={marker.color} />;
      case "destination":
        return <MapPinIcon size={32} color={marker.color} />;
      default:
        return <MapPinIcon size={32} color={marker.color} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: marker.color + "20" }]}>
              {getIcon()}
            </View>
            <Text style={styles.title}>{marker.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: marker.color }]}>
              <Text style={styles.typeText}>{marker.type}</Text>
            </View>
          </View>
          
          <View style={styles.content}>
            {marker.rating && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Rating</Text>
                <Text style={styles.value}>{marker.rating} ⭐</Text>
              </View>
            )}
            
            {marker.distance && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Distance</Text>
                <Text style={styles.value}>{marker.distance} km</Text>
              </View>
            )}
            
            {marker.severity && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Severity</Text>
                <Text style={[styles.value, { color: marker.color }]}>{marker.severity}</Text>
              </View>
            )}
            
            {marker.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.description}>{marker.description}</Text>
              </View>
            )}
          </View>
          
          {marker?.type === "haven" && onGo && (
            <TouchableOpacity
              style={[styles.goBtn, { backgroundColor: marker.color || "#39FF14" }]}
              onPress={onGo}
            >
              <Text style={styles.goBtnText}>Go</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    padding: 24,
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8F9FA",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#212529",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  content: {
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    color: "#6C757D",
    fontSize: 14,
    fontWeight: "500",
  },
  value: {
    color: "#212529",
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionContainer: {
    gap: 8,
    paddingVertical: 8,
  },
  description: {
    color: "#495057",
    fontSize: 14,
    lineHeight: 20,
  },
  goBtn: {
    backgroundColor: "#39FF14",
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 14,
  },
  goBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 15,
  },
  closeBtn: {
    backgroundColor: "#F8F9FA",
    padding: 18,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  closeText: {
    color: "#212529",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default MarkerDetailModal;
