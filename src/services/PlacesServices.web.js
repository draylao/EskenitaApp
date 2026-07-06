// Web-only replacement for PlacesServices.js. The Google Places REST API
// rejects browser requests (CORS), so on web we pull the same kind of
// "well-lit, populated" spots (police, cafes, gas stations, convenience
// stores) from OpenStreetMap via the Overpass API instead.

// Overpass rate-limits aggressively; cache results per ~1km grid cell so
// small GPS movements don't re-query.
const cache = new Map();

export const fetchDynamicSafeHavens = async (latitude, longitude) => {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const radius = 2000; // 2km search area, same as native
    const query = `[out:json][timeout:15];(
      node["amenity"~"^(police|cafe|fuel)$"](around:${radius},${latitude},${longitude});
      node["shop"="convenience"](around:${radius},${latitude},${longitude});
    );out body 40;`;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    const data = await response.json();

    const havens = (data.elements || [])
      .filter((el) => el.tags?.name && el.lat != null && el.lon != null)
      .map((el) => ({
        id: String(el.id),
        title: el.tags.name,
        latlng: { latitude: el.lat, longitude: el.lon },
        // OSM has no ratings; derive a stable demo value in the 3.8–4.9 range
        rating: Math.round((3.8 + (el.id % 12) / 10) * 10) / 10,
      }));

    cache.set(cacheKey, havens);
    return havens;
  } catch (error) {
    console.error("Error fetching dynamic safety anchors (web):", error);
    return [];
  }
};
