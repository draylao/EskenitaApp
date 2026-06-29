const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const fetchDynamicSafeHavens = async (latitude, longitude) => {
  try {
    // Convenience stores, gas stations, and cafes are typically well-lit and populated
    const types = ["convenience_store", "gas_station", "cafe", "police"];
    const radius = 2000; // 2km search area

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${types.join("|")}&opennow=true&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return [];

    return data.results.map((place, index) => ({
      id: place.place_id || index,
      title: place.name,
      latlng: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      rating: place.rating || 0, // Higher ratings often correlate with foot traffic
    }));
  } catch (error) {
    console.error("Error fetching dynamic safety anchors:", error);
    return [];
  }
};
