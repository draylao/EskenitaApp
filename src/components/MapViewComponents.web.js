// Web-only replacement for MapViewComponents.js (react-native-maps does not
// support web). Renders a Leaflet map with OpenStreetMap/CARTO tiles and uses
// the public OSRM API for walking routes, so the demo runs without Google
// native SDKs. Keeps the exact same props + ref API as the native component.
import { Asset } from "expo-asset";
import L from "leaflet";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import MarkerDetailModal from "./MarkerDetailModal";

// ---------------------------------------------------------------------------
// Leaflet CSS (injected once — Metro web doesn't bundle leaflet's css assets)
// ---------------------------------------------------------------------------
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
if (
  typeof document !== "undefined" &&
  !document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)
) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Assets & constants
// ---------------------------------------------------------------------------
const MARKER_IMAGES = {
  haven: Asset.fromModule(require("../../assets/markers/haven-marker.png")).uri,
  threat: Asset.fromModule(require("../../assets/markers/threat-marker.png"))
    .uri,
  destination: Asset.fromModule(
    require("../../assets/markers/destination-marker.png"),
  ).uri,
  default: Asset.fromModule(require("../../assets/markers/default-marker.png"))
    .uri,
};

const USER_TRIANGLE_URI = Asset.fromModule(
  require("../../assets/user-icons/triangle-icon.png"),
).uri;

const MARKER_COLORS = {
  haven: "#39FF14",
  threat: "#FF3131",
  destination: "#FF9900",
  default: "#6C63FF",
};

const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const WALK_SPEED_MPS = 1.33; // ~4.8 km/h, used to derive walking ETAs

// ---------------------------------------------------------------------------
// Geometry helpers (same math as the native component)
// ---------------------------------------------------------------------------
const toRad = (value) => (value * Math.PI) / 180;

const haversineMeters = (from, to) => {
  const R = 6371e3;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bearingDegrees = (from, to) => {
  const phi1 = toRad(from.latitude);
  const phi2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const isDarkBackground = (hex) => {
  if (!hex || typeof hex !== "string" || hex[0] !== "#") return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};

// ---------------------------------------------------------------------------
// OSRM routing
// ---------------------------------------------------------------------------
const describeOsrmStep = (step) => {
  const modifier = step.maneuver?.modifier || "";
  const road = step.name ? ` onto ${step.name}` : "";
  switch (step.maneuver?.type) {
    case "depart":
      return `Head out${road}`;
    case "arrive":
      return "You have arrived at your destination";
    case "roundabout":
    case "rotary":
      return `Take the roundabout${road}`;
    case "turn":
    case "end of road":
    case "fork":
      return modifier ? `Turn ${modifier}${road}` : `Continue${road}`;
    default:
      return `Continue${road}`;
  }
};

// Convert an OSRM step into the Google Directions shape NavigationHud expects
const mapOsrmStep = (step) => {
  const coords = step.geometry?.coordinates;
  if (!coords || coords.length === 0) return null;
  const [endLng, endLat] = coords[coords.length - 1];
  const modifier = step.maneuver?.modifier || "";
  let maneuver = "straight";
  if (modifier.includes("left")) maneuver = "turn-left";
  else if (modifier.includes("right")) maneuver = "turn-right";

  return {
    html_instructions: describeOsrmStep(step),
    maneuver,
    distance: { value: step.distance },
    duration: { value: Math.round(step.distance / WALK_SPEED_MPS) },
    end_location: { lat: endLat, lng: endLng },
  };
};

const fetchOsrmRoute = async (points) => {
  const coordStr = points
    .map((p) => `${p.longitude},${p.latitude}`)
    .join(";");
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.message || `OSRM returned ${data.code}`);
  }
  const route = data.routes[0];
  return {
    latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMin: route.distance / WALK_SPEED_MPS / 60,
    steps: route.legs
      .flatMap((leg) => leg.steps || [])
      .map(mapOsrmStep)
      .filter(Boolean),
  };
};

// ---------------------------------------------------------------------------
// divIcon builders (HTML equivalents of CustomMarker / the user cone marker)
// ---------------------------------------------------------------------------
const buildBadgeIcon = (type) => {
  const img = MARKER_IMAGES[type] || MARKER_IMAGES.default;
  const color = MARKER_COLORS[type] || MARKER_COLORS.default;
  const html = `
    <div style="width:48px;height:48px;border-radius:50%;background:#FFFFFF;
      border:3px solid ${color};display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 4px rgba(0,0,0,0.3);box-sizing:border-box;">
      <img src="${img}" style="width:38px;height:38px;object-fit:contain;" draggable="false"/>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [48, 48],
    iconAnchor: [24, 48],
  });
};

const buildUserIcon = ({ heading, userIconType, isNavigating, coneColor }) => {
  const rotation = heading || 0;
  const dotSize = isNavigating ? 28 : 20;
  const triangleSize = isNavigating ? 60 : 36;
  const center =
    userIconType === "circle"
      ? `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;
          background:#1A73E8;border:2px solid #FFFFFF;
          box-shadow:0 2px 3px rgba(0,0,0,0.3);box-sizing:border-box;"></div>`
      : `<img src="${USER_TRIANGLE_URI}" draggable="false"
          style="width:${triangleSize}px;height:${triangleSize}px;object-fit:contain;
          transform:rotate(${rotation}deg);"/>`;

  const html = `
    <div style="position:relative;width:90px;height:90px;display:flex;
      align-items:center;justify-content:center;">
      <div style="position:absolute;left:0;top:0;width:90px;height:90px;
        transform:rotate(${rotation}deg);">
        <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="userConeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${coneColor}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${coneColor}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <path d="M 50,50 L 20,10 Q 50,-5 80,10 Z" fill="url(#userConeGrad)"/>
        </svg>
      </div>
      ${center}
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [90, 90],
    iconAnchor: [45, 45],
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const MapViewComponent = forwardRef(
  (
    {
      threatPins = [],
      destination,
      userLocation,
      userHeading,
      safeHavens = [],
      userIconType = "circle",
      selectedRouteType,
      onRouteStatsUpdate,
      isNavigating = false,
      onRouteStepsUpdate,
      isSelectingDestination = false,
      onMapPress,
      onNavigateToMarker,
      colors,
    },
    ref,
  ) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const tileRef = useRef(null);
    const userMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const havenMarkersRef = useRef([]);
    const threatMarkersRef = useRef([]);
    const routeLinesRef = useRef({});
    const routesRef = useRef({});
    const selectedRouteTypeRef = useRef(selectedRouteType);
    selectedRouteTypeRef.current = selectedRouteType;
    // Latest handler props, readable from stable Leaflet event listeners
    const handlersRef = useRef({});
    handlersRef.current = { isSelectingDestination, onMapPress };

    const [selectedMarker, setSelectedMarker] = useState(null);
    const [isMarkerModalVisible, setIsMarkerModalVisible] = useState(false);
    // Bumped whenever an OSRM route lands so bearing math below re-runs
    const [routeVersion, setRouteVersion] = useState(0);

    const origin = userLocation;
    const isDark = isDarkBackground(colors?.background);

    // Direction of travel for the first-person view. Browsers expose no
    // compass, so aim at the first route point ~20m ahead (or the
    // destination) instead of the device heading.
    const navBearing = useMemo(() => {
      if (!isNavigating || !origin) return 0;
      let target = destination;
      const route = routesRef.current[selectedRouteType];
      if (route?.latlngs) {
        const ahead = route.latlngs.find(
          ([lat, lng]) =>
            haversineMeters(origin, { latitude: lat, longitude: lng }) > 20,
        );
        if (ahead) target = { latitude: ahead[0], longitude: ahead[1] };
      }
      if (!target) return 0;
      return bearingDegrees(origin, target);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      isNavigating,
      origin?.latitude,
      origin?.longitude,
      selectedRouteType,
      destination?.latitude,
      destination?.longitude,
      routeVersion,
    ]);

    // ------------------------------------------------------------------
    // Safe-haven corridor math (identical to the native component)
    // ------------------------------------------------------------------
    const routeVector = destination
      ? {
          x:
            (destination.longitude - origin.longitude) *
            Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
          y: destination.latitude - origin.latitude,
        }
      : { x: 0, y: 0 };

    const projectionOnRoute = (point) => {
      if (!destination) return -1;
      const pointVec = {
        x:
          (point.longitude - origin.longitude) *
          Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
        y: point.latitude - origin.latitude,
      };
      const dot = pointVec.x * routeVector.x + pointVec.y * routeVector.y;
      const lenSq =
        routeVector.x * routeVector.x + routeVector.y * routeVector.y;
      return lenSq === 0 ? 0 : dot / lenSq;
    };

    const distanceToRoute = (point) => {
      if (!destination) return 999;
      const pointVec = {
        x:
          (point.longitude - origin.longitude) *
          Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
        y: point.latitude - origin.latitude,
      };
      const proj = projectionOnRoute(point);
      const closest = { x: routeVector.x * proj, y: routeVector.y * proj };
      const dx = pointVec.x - closest.x;
      const dy = pointVec.y - closest.y;
      return Math.sqrt(dx * dx + dy * dy) * 111.32; // km per degree
    };

    const forwardHavens = safeHavens
      .map((haven) => ({
        ...haven,
        projection: projectionOnRoute(haven.latlng),
        distanceFromRoute: distanceToRoute(haven.latlng),
      }))
      .filter(({ projection }) => projection > 0.05 && projection < 0.95);

    const balancedSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_THRESHOLD = 0.25;
      const PROGRESS_WINDOW_STRIDE = 0.2;

      const linearCorridorSpots = forwardHavens
        .filter((haven) => haven.distanceFromRoute <= MAX_DETOUR_THRESHOLD)
        .sort((a, b) => a.projection - b.projection);

      const smoothedWaypoints = [];
      let currentWindowEnd = PROGRESS_WINDOW_STRIDE;
      let bestSpotInWindow = null;

      for (const spot of linearCorridorSpots) {
        while (spot.projection > currentWindowEnd) {
          if (bestSpotInWindow) {
            smoothedWaypoints.push(bestSpotInWindow.latlng);
            bestSpotInWindow = null;
          }
          currentWindowEnd += PROGRESS_WINDOW_STRIDE;
        }
        if (
          !bestSpotInWindow ||
          spot.distanceFromRoute < bestSpotInWindow.distanceFromRoute
        ) {
          bestSpotInWindow = spot;
        }
      }
      if (bestSpotInWindow) smoothedWaypoints.push(bestSpotInWindow.latlng);
      return smoothedWaypoints;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(forwardHavens), destination]);

    const alternativeSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_THRESHOLD = 0.4;
      const PROGRESS_WINDOW_STRIDE = 0.2;

      const linearCorridorSpots = forwardHavens
        .filter((haven) => haven.distanceFromRoute <= MAX_DETOUR_THRESHOLD)
        .sort((a, b) => a.projection - b.projection);

      const primaryIds = new Set(
        balancedSafeWaypoints.map((w) => `${w.latitude}-${w.longitude}`),
      );
      const smoothedWaypoints = [];
      let currentWindowEnd = PROGRESS_WINDOW_STRIDE;
      let alternativeSpotInWindow = null;

      for (const spot of linearCorridorSpots) {
        if (primaryIds.has(`${spot.latlng.latitude}-${spot.latlng.longitude}`))
          continue;
        while (spot.projection > currentWindowEnd) {
          if (alternativeSpotInWindow) {
            smoothedWaypoints.push(alternativeSpotInWindow.latlng);
            alternativeSpotInWindow = null;
          }
          currentWindowEnd += PROGRESS_WINDOW_STRIDE;
        }
        if (
          !alternativeSpotInWindow ||
          spot.distanceFromRoute < alternativeSpotInWindow.distanceFromRoute
        ) {
          alternativeSpotInWindow = spot;
        }
      }
      if (alternativeSpotInWindow)
        smoothedWaypoints.push(alternativeSpotInWindow.latlng);

      if (smoothedWaypoints.length === 0 && balancedSafeWaypoints.length > 0) {
        return balancedSafeWaypoints.map((w) => ({
          latitude: w.latitude + 0.0004,
          longitude: w.longitude + 0.0004,
        }));
      }
      return smoothedWaypoints;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(forwardHavens), destination, balancedSafeWaypoints]);

    const visibleSafeHavens = useMemo(() => {
      return safeHavens.filter((haven) => {
        if (!origin) return true;
        const dx = haven.latlng.longitude - origin.longitude;
        const dy = haven.latlng.latitude - origin.latitude;
        const x =
          dx * Math.cos(toRad((origin.latitude + haven.latlng.latitude) / 2));
        const distToUserKm = Math.sqrt(x * x + dy * dy) * 111.32;

        if (distToUserKm <= 0.3) return true;
        if (destination) {
          const proj = projectionOnRoute(haven.latlng);
          if (proj >= -0.1 && proj <= 1.1) {
            if (distanceToRoute(haven.latlng) <= 0.3) return true;
          }
        }
        return false;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeHavens, origin?.latitude, origin?.longitude, destination]);

    // ------------------------------------------------------------------
    // Map initialization
    // ------------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [origin.latitude, origin.longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: true,
      });
      tileRef.current = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 20,
      }).addTo(map);

      map.on("click", (e) => {
        const h = handlersRef.current;
        if (h.isSelectingDestination && h.onMapPress) {
          h.onMapPress({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
      });

      mapRef.current = map;

      // The container mounts before layout settles; make sure tiles fill it
      requestAnimationFrame(() => map.invalidateSize());
      const resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        map.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        destMarkerRef.current = null;
        havenMarkersRef.current = [];
        threatMarkersRef.current = [];
        routeLinesRef.current = {};
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Swap tiles when the theme flips
    useEffect(() => {
      tileRef.current?.setUrl(isDark ? DARK_TILES : LIGHT_TILES);
    }, [isDark]);

    // ------------------------------------------------------------------
    // User location marker (dot/triangle + heading cone)
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !origin) return;
      // While navigating the whole map plane is rotated by -navBearing, so
      // rotating the cone by +navBearing keeps it pointing up the screen
      const icon = buildUserIcon({
        heading: isNavigating ? navBearing : userHeading,
        userIconType,
        isNavigating,
        coneColor: colors?.userConeColor || "#1A73E8",
      });
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([origin.latitude, origin.longitude], {
          icon,
          zIndexOffset: 500,
          interactive: false,
          keyboard: false,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([origin.latitude, origin.longitude]);
        userMarkerRef.current.setIcon(icon);
      }
    }, [
      origin?.latitude,
      origin?.longitude,
      userHeading,
      navBearing,
      userIconType,
      isNavigating,
      colors?.userConeColor,
    ]);

    // ------------------------------------------------------------------
    // Destination marker
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      if (!destination) return;

      const marker = L.marker([destination.latitude, destination.longitude], {
        icon: buildBadgeIcon("destination"),
        zIndexOffset: 400,
      }).addTo(map);
      marker.on("click", () => {
        setSelectedMarker({
          type: "destination",
          title: "Destination",
          color: colors?.neonOrange || "#FF9900",
          description: "Your selected destination",
        });
        setIsMarkerModalVisible(true);
      });
      destMarkerRef.current = marker;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destination?.latitude, destination?.longitude]);

    // ------------------------------------------------------------------
    // Safe-haven markers
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      havenMarkersRef.current.forEach((m) => m.remove());
      havenMarkersRef.current = visibleSafeHavens.map((haven) => {
        const marker = L.marker(
          [haven.latlng.latitude, haven.latlng.longitude],
          { icon: buildBadgeIcon("haven"), zIndexOffset: 100 },
        ).addTo(map);
        marker.on("click", () => {
          setSelectedMarker({
            type: "haven",
            title: haven.title,
            color: "#39FF14",
            rating: haven.rating,
            description: "Safe haven location",
            location: haven.latlng,
          });
          setIsMarkerModalVisible(true);
        });
        return marker;
      });
    }, [visibleSafeHavens]);

    // ------------------------------------------------------------------
    // Threat pin markers
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      threatMarkersRef.current.forEach((m) => m.remove());
      threatMarkersRef.current = threatPins
        .filter(
          (t) => t.location?.latitude != null && t.location?.longitude != null,
        )
        .map((threat) => {
          const marker = L.marker(
            [threat.location.latitude, threat.location.longitude],
            { icon: buildBadgeIcon("threat"), zIndexOffset: 300 },
          ).addTo(map);
          marker.on("click", () => {
            setSelectedMarker({
              type: "threat",
              title: threat.category,
              color: "#FF3131",
              severity: threat.severity,
              description: threat.description,
            });
            setIsMarkerModalVisible(true);
          });
          return marker;
        });
    }, [threatPins]);

    // ------------------------------------------------------------------
    // Routes (OSRM): dangerous = direct, safe/safeAlt = via haven waypoints
    // ------------------------------------------------------------------
    const routeStyle = (type) => {
      const selected = selectedRouteTypeRef.current === type;
      const palette = {
        dangerous: [
          colors?.routeDangerous || "#8B5CF6",
          colors?.routeDangerousLight || "rgba(139, 92, 246, 0.45)",
        ],
        safe: [
          colors?.routeSafe || "#28A745",
          colors?.routeSafeLight || "rgba(40, 167, 69, 0.45)",
        ],
        safeAlt: [
          colors?.routeAlt || "#17A2B8",
          colors?.routeAltLight || "rgba(23, 162, 184, 0.45)",
        ],
      };
      const [strong, light] = palette[type] || palette.safe;
      return {
        color: selected ? strong : light,
        weight: selected ? 7 : 5,
        opacity: 1,
        lineCap: "round",
      };
    };

    const clearRoutes = () => {
      Object.values(routeLinesRef.current).forEach((line) => line?.remove());
      routeLinesRef.current = {};
      routesRef.current = {};
    };

    // Round origin so a few meters of GPS jitter doesn't refetch 3 routes
    const originKey = origin
      ? `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`
      : "";
    const safeWaypointsKey = JSON.stringify(balancedSafeWaypoints);
    const altWaypointsKey = JSON.stringify(alternativeSafeWaypoints);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      if (!destination || !origin) {
        clearRoutes();
        return;
      }

      let cancelled = false;
      const load = async () => {
        const definitions = [
          ["dangerous", [origin, destination]],
          ["safe", [origin, ...balancedSafeWaypoints, destination]],
          ["safeAlt", [origin, ...alternativeSafeWaypoints, destination]],
        ];
        // Sequential on purpose — the public OSRM demo server rate-limits
        for (const [type, points] of definitions) {
          try {
            const route = await fetchOsrmRoute(points);
            if (cancelled || !mapRef.current) return;
            routesRef.current[type] = route;

            routeLinesRef.current[type]?.remove();
            routeLinesRef.current[type] = L.polyline(route.latlngs, {
              ...routeStyle(type),
            }).addTo(mapRef.current);
            if (selectedRouteTypeRef.current === type) {
              routeLinesRef.current[type].bringToFront();
              onRouteStepsUpdate?.(route.steps);
            }

            onRouteStatsUpdate?.(type, {
              duration: route.durationMin,
              distance: route.distanceKm,
            });
            setRouteVersion((v) => v + 1);
          } catch (error) {
            console.error(`${type} route error (web):`, error);
          }
        }
      };
      load();

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      destination?.latitude,
      destination?.longitude,
      originKey,
      safeWaypointsKey,
      altWaypointsKey,
    ]);

    // Restyle lines + push the right step list when the selection changes
    useEffect(() => {
      Object.entries(routeLinesRef.current).forEach(([type, line]) => {
        line?.setStyle(routeStyle(type));
      });
      routeLinesRef.current[selectedRouteType]?.bringToFront();
      if (routesRef.current[selectedRouteType]) {
        onRouteStepsUpdate?.(routesRef.current[selectedRouteType].steps);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRouteType]);

    // ------------------------------------------------------------------
    // Camera behavior
    // ------------------------------------------------------------------
    // Auto-fit map to show the full route when a destination is set
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !destination || isNavigating) return;
      const bounds = L.latLngBounds(
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      );
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 100],
        paddingBottomRight: [50, 200],
        animate: true,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destination?.latitude, destination?.longitude, isNavigating]);

    // Follow the user while navigating. Leaflet can't pitch its camera, so
    // the render layer fakes it: the map plane gets a CSS 3D tilt and is
    // rotated so the route direction points up (see the transform in JSX).
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !isNavigating || !origin) return;
      map.setView([origin.latitude, origin.longitude], 18, {
        animate: true,
        duration: 0.6,
      });
    }, [isNavigating, origin?.latitude, origin?.longitude]);

    // The tilted plane breaks pointer hit-testing, so freeze gestures while
    // in first-person mode; the container also changes size (oversized to
    // keep tiles under the tilted edges), hence invalidateSize
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const handlers = [
        map.dragging,
        map.scrollWheelZoom,
        map.doubleClickZoom,
        map.touchZoom,
        map.boxZoom,
        map.keyboard,
      ];
      handlers.forEach((h) => h && (isNavigating ? h.disable() : h.enable()));
      requestAnimationFrame(() => map.invalidateSize());
    }, [isNavigating]);

    // ------------------------------------------------------------------
    // Ref API compatible with react-native-maps' MapView
    // ------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        fitToCoordinates: (coordinates = [], options = {}) => {
          const map = mapRef.current;
          if (!map || coordinates.length === 0) return;
          const bounds = L.latLngBounds(
            coordinates.map((c) => [c.latitude, c.longitude]),
          );
          const pad = options.edgePadding || {};
          map.fitBounds(bounds, {
            paddingTopLeft: [pad.left ?? 50, pad.top ?? 50],
            paddingBottomRight: [pad.right ?? 50, pad.bottom ?? 50],
            animate: options.animated !== false,
          });
        },
        animateCamera: (camera = {}, options = {}) => {
          const map = mapRef.current;
          if (!map) return;
          const center = camera.center
            ? [camera.center.latitude, camera.center.longitude]
            : map.getCenter();
          const zoom =
            camera.zoom != null ? Math.min(camera.zoom, 19) : map.getZoom();
          map.flyTo(center, zoom, {
            duration: (options.duration ?? 600) / 1000,
          });
        },
        animateToRegion: (region, duration = 500) => {
          const map = mapRef.current;
          if (!map || !region) return;
          const zoom = region.latitudeDelta
            ? Math.min(Math.round(Math.log2(360 / region.latitudeDelta)), 19)
            : map.getZoom();
          map.flyTo([region.latitude, region.longitude], zoom, {
            duration: duration / 1000,
          });
        },
      }),
      [],
    );

    const handleGoFromMarker = () => {
      if (selectedMarker?.location && onNavigateToMarker) {
        onNavigateToMarker(selectedMarker);
      }
      setIsMarkerModalVisible(false);
      setSelectedMarker(null);
    };

    // First-person mode: oversize the map plane so its edges stay covered
    // with tiles, tilt it away from the viewer (the "pitch"), rotate it so
    // the route direction points up, and nudge it down so the user marker
    // sits in the lower half of the screen — mirroring the native camera
    // (pitch 70, heading-up, user low on screen).
    const mapPlaneStyle = isNavigating
      ? {
          position: "absolute",
          top: "-100%",
          left: "-100%",
          width: "300%",
          height: "300%",
          transformOrigin: "center center",
          transform: `translateY(10%) rotateX(52deg) rotateZ(${-navBearing}deg)`,
          transition: "transform 700ms ease",
        }
      : {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transformOrigin: "center center",
          transform: "none",
          transition: "transform 700ms ease",
          cursor: isSelectingDestination ? "crosshair" : "grab",
        };

    return (
      <View style={styles.container}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            overflow: "hidden",
            perspective: "1000px",
          }}
        >
          <div ref={containerRef} style={mapPlaneStyle} />
        </div>
        <MarkerDetailModal
          visible={isMarkerModalVisible}
          onClose={() => {
            setIsMarkerModalVisible(false);
            setSelectedMarker(null);
          }}
          onGo={handleGoFromMarker}
          marker={selectedMarker}
        />
      </View>
    );
  },
);

MapViewComponent.displayName = "MapViewComponent";

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
});

export default MapViewComponent;
