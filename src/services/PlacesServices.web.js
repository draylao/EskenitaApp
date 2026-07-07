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

const MOCK_WEB_LOCATIONS = [
  {
    id: "mock-7-eleven-kingswood",
    title: "7-Eleven KINGSWOOD (590)",
    type: "Convenience Store",
    accessibility: "Open",
    latlng: { latitude: 14.56691081, longitude: 121.0124584 },
  },
  {
    id: "mock-7-eleven-ocampo",
    title: "7-Eleven P.Ocampo 2567",
    type: "Convenience Store",
    accessibility: "Open",
    latlng: { latitude: 14.56674106, longitude: 121.0135202 },
  },
  {
    id: "mock-beng-q-store",
    title: "Beng Q Store",
    type: "Convenience Store",
    accessibility: "Open",
    latlng: { latitude: 14.56635686, longitude: 121.0116749 },
  },
  {
    id: "mock-210-weekend-club",
    title: "The 210 Weekend Club",
    type: "Cafe",
    accessibility: "Closed",
    latlng: { latitude: 14.56931627, longitude: 121.0114066 },
  },
  {
    id: "mock-pen-coop-cafe",
    title: "Pen-Coop Cafe",
    type: "Cafe",
    accessibility: "Closed",
    latlng: { latitude: 14.56826147, longitude: 121.009901 },
  },
  {
    id: "mock-nihon-cafe",
    title: "Nihon Cafe Metropolitan",
    type: "Cafe",
    accessibility: "Open",
    latlng: { latitude: 14.56658792, longitude: 121.0130313 },
  },
  {
    id: "mock-ayat-coffee",
    title: "Ayat Coffee Bar",
    type: "Cafe",
    accessibility: "Closed",
    latlng: { latitude: 14.5654318, longitude: 121.0134174 },
  },
  {
    id: "mock-siklab-kamagong",
    title: "Siklab+Kamagong",
    type: "Asian Restaurant",
    accessibility: "Closed",
    latlng: { latitude: 14.56652113, longitude: 121.0088392 },
  },
  {
    id: "mock-mapua-university",
    title: "Mapua University",
    type: "Private University",
    accessibility: "Closed",
    latlng: { latitude: 14.56660021, longitude: 121.014991 },
  },
  {
    id: "mock-bagtikan",
    title: "7/11 BAGTIKAN",
    type: "Convenience Store",
    accessibility: "Open",
    latlng: { latitude: 14.56267849, longitude: 121.0108092 },
  },
];

const toRad = (value) => (value * Math.PI) / 180;

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const isSafeHaven = (place) => {
  const normalizedType = (place.type || "").toLowerCase();
  return (
    normalizedType.includes("convenience") || normalizedType.includes("cafe")
  );
};

export const fetchMockPlaces = async (latitude, longitude) => {
  const nearbyPlaces = MOCK_WEB_LOCATIONS.filter((place) => {
    const distanceKm = getDistanceKm(
      latitude,
      longitude,
      place.latlng.latitude,
      place.latlng.longitude,
    );

    return distanceKm <= 2.5;
  }).map((place) => ({
    id: place.id,
    title: place.title,
    category: place.type,
    accessibility: place.accessibility,
    latlng: place.latlng,
    rating: isSafeHaven(place) ? 4.6 : 4.0,
    type: isSafeHaven(place) ? "safe_haven" : "normal",
    description: isSafeHaven(place)
      ? "Trusted public stop marked as a safe haven"
      : "Regular place users can visit",
  }));

  return {
    safeHavens: nearbyPlaces.filter((place) => place.type === "safe_haven"),
    normalPlaces: nearbyPlaces.filter((place) => place.type === "normal"),
    allPlaces: nearbyPlaces,
  };
};

export const fetchDynamicSafeHavens = async (latitude, longitude) => {
  const { safeHavens } = await fetchMockPlaces(latitude, longitude);
  return safeHavens;
};
