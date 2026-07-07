// Web-only search bar. GooglePlacesAutocomplete can't call the Places API
// from a browser (CORS), so on web we geocode with OpenStreetMap's Nominatim
// instead. Visually mirrors the native search bar in HomeScreen.
import { Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import useDebounce from "../../hooks/useDebounce";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const WebPlacesSearch = ({
  placeholder = "Search here",
  userLocation,
  hasDestination = false,
  onSelect,
  onClear,
  colors,
}) => {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedText = useDebounce(text, 450);
  const styles = createStyles(colors);

  // Once a destination is chosen (via search, map tap, or haven "Go"),
  // collapse the suggestion list like the native search bar does
  useEffect(() => {
    if (hasDestination) setResults([]);
  }, [hasDestination]);

  useEffect(() => {
    const query = debouncedText.trim();
    if (query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const search = async () => {
      setIsLoading(true);
      try {
        // Bias results toward the user's area (viewbox is a soft preference)
        const params = new URLSearchParams({
          format: "json",
          q: query,
          limit: "6",
          countrycodes: "ph",
          addressdetails: "0",
        });
        if (userLocation) {
          const d = 0.5;
          params.set(
            "viewbox",
            [
              userLocation.longitude - d,
              userLocation.latitude + d,
              userLocation.longitude + d,
              userLocation.latitude - d,
            ].join(","),
          );
        }
        const response = await fetch(`${NOMINATIM_URL}?${params}`);
        const data = await response.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Nominatim search error:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    search();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  const handleSelect = (item) => {
    setResults([]);
    setText(item.display_name.split(",")[0]);
    onSelect?.({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      label: item.display_name,
    });
  };

  const handleClear = () => {
    setText("");
    setResults([]);
    onClear?.();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <View style={styles.iconContainer}>
          <Search size={22} color={colors.textSecondary} />
        </View>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          numberOfLines={1}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : text.length > 0 || hasDestination ? (
          <TouchableOpacity style={styles.iconContainer} onPress={handleClear}>
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!hasDestination && results.length > 0 && (
        <ScrollView
          style={styles.listView}
          keyboardShouldPersistTaps="handled"
        >
          {results.map((item) => (
            <TouchableOpacity
              key={`${item.place_id}`}
              style={styles.row}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.description} numberOfLines={2}>
                {item.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: { flex: 1 },
    inputContainer: {
      backgroundColor: colors.card,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 28,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 15,
      height: 46,
    },
    iconContainer: {
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    textInput: {
      backgroundColor: "transparent",
      height: "100%",
      margin: 6,
      fontSize: 16,
      color: colors.textPrimary,
      flex: 1,
      // @ts-ignore web-only: remove browser focus ring
      outlineStyle: "none",
    },
    listView: {
      maxHeight: 300,
      backgroundColor: colors.card,
      borderRadius: 16,
      marginTop: 8,
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      padding: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    description: {
      color: colors.textPrimary,
      fontSize: 14,
    },
  });

export default WebPlacesSearch;
