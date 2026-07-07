// Web-only replacement for PlacesServices.js. The Google Places REST API
// rejects browser requests (CORS), so on web we pull the same kind of
// "well-lit, populated" spots (police, cafes, gas stations, convenience
// stores) from OpenStreetMap via the Overpass API instead.

// Overpass rate-limits aggressively. Cache per ~1km grid cell, and cache the
// in-flight promise itself so a burst of location updates (common right
// after the browser grants geolocation) shares one request instead of
// hammering the API into returning XML error pages.
const cache = new Map();

// Overpass allows roughly one anonymous request per second; space queued
// requests out globally so a burst of location updates doesn't get the
// whole session rate-limited (it answers 429s with XML error pages).
let requestChain = Promise.resolve();
const THROTTLE_MS = 1500;

const throttledFetch = (url, options) => {
  const result = requestChain.then(() => fetch(url, options));
  requestChain = result
    .catch(() => {})
    .then(() => new Promise((resolve) => setTimeout(resolve, THROTTLE_MS)));
  return result;
};

export const fetchDynamicSafeHavens = (latitude, longitude) => {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const request = (async () => {
    try {
      const radius = 2000; // 2km search area, same as native
      const query = `[out:json][timeout:15];(
        node["amenity"~"^(police|cafe|fuel)$"](around:${radius},${latitude},${longitude});
        node["shop"="convenience"](around:${radius},${latitude},${longitude});
      );out body 40;`;

      const response = await throttledFetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
        },
      );
      if (!response.ok) {
        throw new Error(`Overpass returned ${response.status}`);
      }
      const data = await response.json();

      return (data.elements || [])
        .filter((el) => el.tags?.name && el.lat != null && el.lon != null)
        .map((el) => ({
          id: String(el.id),
          title: el.tags.name,
          latlng: { latitude: el.lat, longitude: el.lon },
          // OSM has no ratings; derive a stable demo value (3.8–4.9 range)
          rating: Math.round((3.8 + (el.id % 12) / 10) * 10) / 10,
        }));
    } catch (error) {
      console.error("Error fetching dynamic safety anchors (web):", error);
      // Forget the failed attempt so a later retry can succeed
      cache.delete(cacheKey);
      return [];
    }
  })();

  cache.set(cacheKey, request);
  return request;
};
