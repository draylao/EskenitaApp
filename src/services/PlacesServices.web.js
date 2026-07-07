const csvCache = {
  promise: null,
  data: null,
};

const parseCsv = (text) => {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  const pushRow = () => {
    if (currentRow.some((cell) => cell.trim() !== "")) {
      rows.push(currentRow);
    }
    currentRow = [];
    currentValue = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      pushRow();
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    pushRow();
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, headerIndex) => [
          header,
          values[headerIndex] != null ? values[headerIndex].trim() : "",
        ]),
      ),
    );
};

const loadLocationData = async () => {
  if (csvCache.data) {
    return csvCache.data;
  }

  if (!csvCache.promise) {
    csvCache.promise = (async () => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/data/location_data.csv`
          : "/data/location_data.csv";
      const response = await fetch(url);
      const text = await response.text();
      return parseCsv(text);
    })();
  }

  csvCache.data = await csvCache.promise;
  return csvCache.data;
};

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
  const rows = await loadLocationData();

  const nearbyPlaces = rows
    .filter((place) => {
      const locationLatitude = Number(place.latitude);
      const locationLongitude = Number(place.longitude);
      if (Number.isNaN(locationLatitude) || Number.isNaN(locationLongitude)) {
        return false;
      }

      const distanceKm = getDistanceKm(
        latitude,
        longitude,
        locationLatitude,
        locationLongitude,
      );

      return distanceKm <= 2.5;
    })
    .map((place) => {
      const locationLatitude = Number(place.latitude);
      const locationLongitude = Number(place.longitude);
      const safeHaven = isSafeHaven(place);

      return {
        id: place.location_name || `${locationLatitude}-${locationLongitude}`,
        title: place.location_name || "Unnamed location",
        category: place.type || "Unknown",
        accessibility: place.accessibility || "Unknown",
        latlng: {
          latitude: locationLatitude,
          longitude: locationLongitude,
        },
        rating: safeHaven ? 4.6 : 4.0,
        type: safeHaven ? "safe_haven" : "normal",
        description: safeHaven
          ? "Trusted public stop marked as a safe haven"
          : "Regular place users can visit",
      };
    });

  return {
    safeHavens: nearbyPlaces.filter((place) => place.type === "safe_haven"),
    normalPlaces: [],
    allPlaces: nearbyPlaces,
  };
};

export const fetchDynamicSafeHavens = async (latitude, longitude) => {
  const { safeHavens } = await fetchMockPlaces(latitude, longitude);
  return safeHavens;
};
