// Web map layer built on MapLibre GL JS (react-native-maps has no web
// support). Unlike the previous Leaflet version, MapLibre gives us a real
// 3D camera — pitch, bearing, smooth flyTo — plus vector tiles and native
// marker clustering, so the navigation view matches the tilted native one.
//
// External contract is identical to ./MapView.js (native): same props, same
// ref API (fitToCoordinates / animateCamera / animateToRegion), plus web
// extras used by MapControls (zoomIn / zoomOut / resetNorth / getBearing).
import { Asset } from "expo-asset";
import maplibregl from "maplibre-gl";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import MarkerDetailModal from "../MarkerDetailModal";
import LoadingOverlay from "../overlays/LoadingOverlay";

// ---------------------------------------------------------------------------
// MapLibre CSS (injected once — Metro doesn't bundle the package css)
// ---------------------------------------------------------------------------
const MAPLIBRE_CSS_URL =
  "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css";
if (
  typeof document !== "undefined" &&
  !document.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)
) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MAPLIBRE_CSS_URL;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Use actual PNG files where they exist, SVG for missing ones
const ICONS = {
  "haven-icon": Asset.fromModule(require("../../../assets/markers/haven-marker.png")).uri,
  "threat-icon": Asset.fromModule(require("../../../assets/markers/threat-marker.png")).uri,
};

// SVG for destination (PNG missing)
const DESTINATION_ICON_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V6s-1 1-4 1-5-2-8-2-4 1-4 1z' fill='%23FF9900' stroke='white' stroke-width='2'/%3E%3Cpath d='M4 22v-7' stroke='white' stroke-width='2'/%3E%3C/svg%3E";
const USER_TRIANGLE_URI = Asset.fromModule(require("../../../assets/user-icons/triangle-icon.png")).uri;

const HAVEN_COLOR = "#39FF14";
const THREAT_COLOR = "#FF3131";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const WALK_SPEED_MPS = 1.33; // ~4.8 km/h, used to derive walking ETAs

const NAV_CAMERA = { zoom: 17.5, pitch: 62, duration: 900 };

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
// OSRM routing (shared shape with the Google Directions data native uses)
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
  const coordStr = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.message || `OSRM returned ${data.code}`);
  }
  const route = data.routes[0];
  return {
    geometry: route.geometry, // GeoJSON LineString, ready for a source
    distanceKm: route.distance / 1000,
    durationMin: route.distance / WALK_SPEED_MPS / 60,
    steps: route.legs
      .flatMap((leg) => leg.steps || [])
      .map(mapOsrmStep)
      .filter(Boolean),
  };
};

// ---------------------------------------------------------------------------
// DOM marker elements (user cone + destination badge)
// ---------------------------------------------------------------------------
const buildUserElement = ({ userIconType, isNavigating, coneColor }) => {
  const dotSize = isNavigating ? 26 : 20;
  const triangleSize = isNavigating ? 52 : 36;
  const center =
    userIconType === "circle"
      ? `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;
          background:#1A73E8;border:2.5px solid #FFFFFF;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);box-sizing:border-box;"></div>`
      : `<img src="${USER_TRIANGLE_URI}" draggable="false"
          style="width:${triangleSize}px;height:${triangleSize}px;object-fit:contain;"/>`;

  const el = document.createElement("div");
  el.style.cssText =
    "position:relative;width:90px;height:90px;display:flex;align-items:center;justify-content:center;";
  el.innerHTML = `
    <div style="position:absolute;left:0;top:0;width:90px;height:90px;">
      <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="userConeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${coneColor}" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="${coneColor}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M 50,50 L 20,10 Q 50,-5 80,10 Z" fill="url(#userConeGrad)"/>
      </svg>
    </div>
    ${center}`;
  return el;
};

const buildDestinationElement = (colors) => {
  const el = document.createElement("div");
  el.style.cssText = "cursor:pointer;";
  const isDark = colors?.background === "#15120F";
  const bgColor = isDark ? colors?.card || "#241F1A" : "#FFFFFF";
  const borderColor = "#FF9900";
  el.innerHTML = `
    <div style="width:48px;height:48px;border-radius:50%;background:${bgColor};
      border:4px solid ${borderColor};display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 12px rgba(255,153,0,0.4),0 2px 4px rgba(0,0,0,0.3);box-sizing:border-box;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${borderColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V6s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <path d="M4 22v-7"/>
      </svg>
    </div>`;
  return el;
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
      onCameraChanged,
      colors,
    },
    ref,
  ) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const userMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const routesRef = useRef({});
    const iconSizesRef = useRef({});
    const havenByIdRef = useRef(new Map());
    const geoJsonRef = useRef({ havens: null, threats: null, routes: {} });
    const selectedRouteTypeRef = useRef(selectedRouteType);
    selectedRouteTypeRef.current = selectedRouteType;
    const handlersRef = useRef({});
    handlersRef.current = {
      isSelectingDestination,
      onMapPress,
      onCameraChanged,
    };
    const wasNavigatingRef = useRef(false);
    const activeAnimationRef = useRef(null);

    const [selectedMarker, setSelectedMarker] = useState(null);
    const [isMarkerModalVisible, setIsMarkerModalVisible] = useState(false);
    // The map lives in state (not just a ref) so every effect re-binds to
    // the new instance whenever the map is created or recreated — refs go
    // stale across hot-reload remounts and StrictMode double-mounts.
    const [mapInstance, setMapInstance] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [routeVersion, setRouteVersion] = useState(0);

    const origin = userLocation;
    const isDark = isDarkBackground(colors?.background);

    // ------------------------------------------------------------------
    // Direction of travel for the first-person camera. Browsers expose no
    // compass, so aim at the first route point ~20m ahead (or destination).
    // ------------------------------------------------------------------
    const navBearing = useMemo(() => {
      if (!isNavigating || !origin) return 0;
      const route = routesRef.current[selectedRouteType];
      const coords = route?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        // Direction of the route's first real segment — NOT user→route,
        // which points sideways when GPS sits off the road centerline
        const start = { latitude: coords[0][1], longitude: coords[0][0] };
        const ahead = coords.find(
          ([lng, lat]) =>
            haversineMeters(start, { latitude: lat, longitude: lng }) > 15,
        );
        if (ahead) {
          return bearingDegrees(start, {
            latitude: ahead[1],
            longitude: ahead[0],
          });
        }
      }
      if (!destination) return 0;
      return bearingDegrees(origin, destination);
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

    // Which side of the direct corridor a point sits on (+1/-1) — used to
    // send the alternative route down the other side so it looks different
    const sideOfRoute = (point) => {
      if (!destination) return 1;
      const pointVec = {
        x:
          (point.longitude - origin.longitude) *
          Math.cos(toRad((origin.latitude + destination.latitude) / 2)),
        y: point.latitude - origin.latitude,
      };
      const cross = routeVector.x * pointVec.y - routeVector.y * pointVec.x;
      return cross >= 0 ? 1 : -1;
    };

    const forwardHavens = safeHavens
      .map((haven) => ({
        ...haven,
        projection: projectionOnRoute(haven.latlng),
        distanceFromRoute: distanceToRoute(haven.latlng),
        side: sideOfRoute(haven.latlng),
      }))
      .filter(({ projection }) => projection > 0.05 && projection < 0.95);

    // Keep safe routes SHORT: with dense demo havens, forcing the route
    // through one haven per progress-window made OSRM produce sightseeing
    // tours. Instead pick at most two havens that hug the direct corridor,
    // visited in travel order (no backtracking).
    const balancedSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_KM = 0.12;
      const MAX_WAYPOINTS = 2;

      return forwardHavens
        .filter((haven) => haven.distanceFromRoute <= MAX_DETOUR_KM)
        .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
        .slice(0, MAX_WAYPOINTS)
        .sort((a, b) => a.projection - b.projection)
        .map((haven) => haven.latlng);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(forwardHavens), destination]);

    // Alternative route: one haven NOT used by the primary route, ideally
    // on the OTHER side of the corridor so the two safe paths visibly split
    const alternativeSafeWaypoints = useMemo(() => {
      if (!destination || forwardHavens.length === 0) return [];
      const MAX_DETOUR_KM = 0.3;

      const primaryPicks = forwardHavens
        .filter((haven) => haven.distanceFromRoute <= 0.12)
        .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
        .slice(0, 2);
      const primaryIds = new Set(primaryPicks.map((h) => String(h.id)));
      const primarySide = primaryPicks[0]?.side ?? 1;

      const candidates = forwardHavens.filter(
        (haven) =>
          !primaryIds.has(String(haven.id)) &&
          haven.distanceFromRoute <= MAX_DETOUR_KM,
      );
      const oppositeSide = candidates.filter((h) => h.side !== primarySide);
      const pool = oppositeSide.length > 0 ? oppositeSide : candidates;

      const picks = pool
        .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
        .slice(0, 1)
        .map((haven) => haven.latlng);

      if (picks.length === 0 && balancedSafeWaypoints.length > 0) {
        // Offset primary slightly to avoid drawing two identical lines
        return balancedSafeWaypoints.map((w) => ({
          latitude: w.latitude + 0.0004,
          longitude: w.longitude + 0.0004,
        }));
      }
      return picks;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(forwardHavens), destination, balancedSafeWaypoints]);

    // Ordered pool of single-haven detours (closest to the corridor first)
    // used as retry candidates when two routes snap onto the same line
    const distinctCandidatePool = useMemo(() => {
      if (!destination) return [];
      return forwardHavens
        .filter((haven) => haven.distanceFromRoute <= 0.35)
        .sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
        .map((haven) => haven.latlng);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(forwardHavens), destination]);

    const visiblePlaces = useMemo(() => {
      return safeHavens.filter((place) => {
        if (!origin) return true;
        const dx = place.latlng.longitude - origin.longitude;
        const dy = place.latlng.latitude - origin.latitude;
        const x =
          dx * Math.cos(toRad((origin.latitude + place.latlng.latitude) / 2));
        const distToUserKm = Math.sqrt(x * x + dy * dy) * 111.32;

        if (distToUserKm <= 2.5) return true;
        if (destination) {
          const proj = projectionOnRoute(place.latlng);
          if (proj >= -0.1 && proj <= 1.1) {
            if (distanceToRoute(place.latlng) <= 1.2) return true;
          }
        }
        return false;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeHavens, origin?.latitude, origin?.longitude, destination]);

    // ------------------------------------------------------------------
    // GeoJSON builders
    // ------------------------------------------------------------------
    const havensGeoJson = useMemo(() => {
      havenByIdRef.current = new Map(
        visiblePlaces.map((place) => [String(place.id), place]),
      );
      return {
        type: "FeatureCollection",
        features: visiblePlaces.map((place) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [place.latlng.longitude, place.latlng.latitude],
          },
          properties: {
            id: String(place.id),
            title: place.title,
            rating: place.rating,
            kind: "safe_haven",
            description: place.description || "Safe haven",
          },
        })),
      };
    }, [visiblePlaces]);

    const threatsGeoJson = useMemo(
      () => ({
        type: "FeatureCollection",
        features: threatPins
          .filter(
            (t) =>
              t.location?.latitude != null && t.location?.longitude != null,
          )
          .map((t) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [t.location.longitude, t.location.latitude],
            },
            properties: {
              id: String(t.id),
              title: t.category,
              severity: t.severity || "",
              description: t.description || "",
            },
          })),
      }),
      [threatPins],
    );

    // ------------------------------------------------------------------
    // Style-level overlays: images, sources, layers. Re-run after every
    // setStyle (theme switch) since that wipes everything custom.
    // ------------------------------------------------------------------
    const routePalette = (type) => {
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
      return palette[type] || palette.safe;
    };

    const applyRouteStyling = (map) => {
      ["dangerous", "safe", "safeAlt"].forEach((type) => {
        if (!map.getLayer(`route-${type}`)) return;
        const selected = selectedRouteTypeRef.current === type;
        const [strong, light] = routePalette(type);

        if (type === "dangerous") {
          // Always fully visible, but dashed — reads as "blocked/dangerous"
          // next to the solid safe routes (it can never be selected)
          map.setPaintProperty(`route-${type}`, "line-color", strong);
          map.setPaintProperty(`route-${type}`, "line-width", 5);
          map.setPaintProperty(`route-${type}`, "line-dasharray", [2, 1.8]);
          map.setPaintProperty(`route-${type}-casing`, "line-opacity", 0);
          return;
        }

        map.setPaintProperty(
          `route-${type}`,
          "line-color",
          selected ? strong : light,
        );
        map.setPaintProperty(`route-${type}`, "line-width", selected ? 7 : 5);
        map.setPaintProperty(
          `route-${type}-casing`,
          "line-opacity",
          selected ? 0.9 : 0,
        );
      });
    };

    const ensureOverlays = async (map) => {
      // Cluster count labels need a glyph font that exists in the style
      const styleFont = map
        .getStyle()
        .layers?.find((l) => l.layout?.["text-font"])?.layout["text-font"] || [
        "Open Sans Regular",
      ];

      // Load marker images into MapLibre
      for (const [name, uri] of Object.entries(ICONS)) {
        if (!map.hasImage(name)) {
          try {
            const image = await map.loadImage(uri);
            if (!map.hasImage(name)) map.addImage(name, image.data);
            // Marker PNGs ship at high resolution; scale each so it renders
            // at ~34px inside its 21px-radius badge circle
            iconSizesRef.current[name] = 34 / (image.data.width || 34);
          } catch (e) {
            console.error(`Failed to load map icon ${name}:`, e);
          }
        }
      }
      if (!mapRef.current) return; // unmounted while awaiting

      const emptyLine = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] },
      };

      // --- Route sources + layers (casing under the colored line) ---
      ["dangerous", "safe", "safeAlt"].forEach((type) => {
        if (!map.getSource(`route-${type}`)) {
          map.addSource(`route-${type}`, {
            type: "geojson",
            data: geoJsonRef.current.routes[type] || emptyLine,
          });
        }
        if (!map.getLayer(`route-${type}-casing`)) {
          map.addLayer({
            id: `route-${type}-casing`,
            type: "line",
            source: `route-${type}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": isDark ? "#FFFFFF" : "#1F1F1F",
              "line-width": 10,
              "line-opacity": 0,
            },
          });
        }
        if (!map.getLayer(`route-${type}`)) {
          map.addLayer({
            id: `route-${type}`,
            type: "line",
            source: `route-${type}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#28A745", "line-width": 5 },
          });
        }
      });

      // --- Clustered point sources + layers (havens & threats) ---
      const pointSets = [
        {
          key: "havens",
          color: HAVEN_COLOR,
          icon: "haven-icon",
          data: geoJsonRef.current.havens,
        },
        {
          key: "threats",
          color: THREAT_COLOR,
          icon: "threat-icon",
          data: geoJsonRef.current.threats,
        },
      ];

      pointSets.forEach(({ key, color, icon, data }) => {
        if (!map.getSource(key)) {
          map.addSource(key, {
            type: "geojson",
            data: data || { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterRadius: 46,
            clusterMaxZoom: 16,
          });
        }
        if (!map.getLayer(`${key}-clusters`)) {
          map.addLayer({
            id: `${key}-clusters`,
            type: "circle",
            source: key,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": color,
              "circle-opacity": 0.22,
              "circle-stroke-color": color,
              "circle-stroke-width": 2,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                18,
                10,
                24,
                25,
                30,
              ],
            },
          });
        }
        if (!map.getLayer(`${key}-cluster-count`)) {
          map.addLayer({
            id: `${key}-cluster-count`,
            type: "symbol",
            source: key,
            filter: ["has", "point_count"],
            layout: {
              "text-field": "{point_count_abbreviated}",
              "text-font": styleFont,
              "text-size": 13,
            },
            paint: { "text-color": isDark ? "#FFFFFF" : "#1F1F1F" },
          });
        }
        // Individual points: white badge circle + the icon on top
        if (!map.getLayer(`${key}-point-bg`)) {
          map.addLayer({
            id: `${key}-point-bg`,
            type: "circle",
            source: key,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": "#FFFFFF",
              "circle-radius": 21,
              "circle-stroke-color": color,
              "circle-stroke-width": 3,
            },
          });
        }
        if (!map.getLayer(`${key}-point`)) {
          map.addLayer({
            id: `${key}-point`,
            type: "symbol",
            source: key,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": icon,
              "icon-size": iconSizesRef.current[icon] || 0.5,
              "icon-allow-overlap": true,
            },
          });
        }
      });

      applyRouteStyling(map);
    };

    // ------------------------------------------------------------------
    // Map init
    // ------------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      // Deferred one frame: React StrictMode mounts, unmounts, and remounts
      // in dev — creating the map synchronously leaves a half-torn-down
      // instance whose async tile loads throw. The throwaway mount is
      // cleaned up before this frame fires, so only the real one builds.
      let disposed = false;
      let map = null;
      const rafId = requestAnimationFrame(() => {
        if (disposed || !containerRef.current) return;
        map = createMap();
      });

      const createMap = () => {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: isDark ? DARK_STYLE : LIGHT_STYLE,
          center: [origin.longitude, origin.latitude],
          zoom: 15.5,
          attributionControl: { compact: true },
          maxPitch: 70,
        });
        mapRef.current = map;
        setMapInstance(map);
        if (
          typeof window !== "undefined" &&
          process.env.NODE_ENV !== "production"
        ) {
          window.__ESKENITA_MAP__ = map; // dev-only handle for debugging
        }

        map.addControl(new maplibregl.ScaleControl(), "bottom-left");

        map.on("style.load", () => {
          ensureOverlays(map);
        });
        map.once("load", () => setIsMapReady(true));

        // Tap-to-set-destination
        map.on("click", (e) => {
          const h = handlersRef.current;
          if (h.isSelectingDestination && h.onMapPress) {
            h.onMapPress({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
          }
        });

        // Marker taps → detail card (skipped while picking a destination)
        map.on("click", "havens-point", (e) => {
          if (handlersRef.current.isSelectingDestination) return;
          const props = e.features?.[0]?.properties;
          const place = props && havenByIdRef.current.get(String(props.id));
          if (!place) return;
          setSelectedMarker({
            type: "haven",
            title: place.title,
            color: HAVEN_COLOR,
            rating: place.rating,
            description: place.description || "Safe haven",
            location: place.latlng,
          });
          setIsMarkerModalVisible(true);
        });
        map.on("click", "threats-point", (e) => {
          if (handlersRef.current.isSelectingDestination) return;
          const props = e.features?.[0]?.properties;
          if (!props) return;
          setSelectedMarker({
            type: "threat",
            title: props.title,
            color: THREAT_COLOR,
            severity: props.severity,
            description: props.description,
          });
          setIsMarkerModalVisible(true);
        });

        // Cluster taps → zoom into the cluster
        ["havens", "threats"].forEach((key) => {
          map.on("click", `${key}-clusters`, async (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const zoom = await map
              .getSource(key)
              .getClusterExpansionZoom(feature.properties.cluster_id);
            map.easeTo({
              center: feature.geometry.coordinates,
              zoom: zoom + 0.5,
              duration: 500,
            });
          });
        });

        // Pointer affordances over interactive layers
        [
          "havens-point",
          "threats-point",
          "havens-clusters",
          "threats-clusters",
        ].forEach((layer) => {
          map.on("mouseenter", layer, () => {
            if (!handlersRef.current.isSelectingDestination)
              map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            if (!handlersRef.current.isSelectingDestination)
              map.getCanvas().style.cursor = "";
          });
        });

        // Report bearing to the compass control (throttled via rAF)
        let rafId = null;
        const reportCamera = () => {
          if (rafId) return;
          rafId = requestAnimationFrame(() => {
            rafId = null;
            handlersRef.current.onCameraChanged?.({
              bearing: map.getBearing(),
              pitch: map.getPitch(),
            });
          });
        };
        map.on("rotate", reportCamera);
        map.on("pitchend", reportCamera);

        return map;
      };

      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        map?.remove();
        mapRef.current = null;
        setMapInstance(null);
        setIsMapReady(false);
        userMarkerRef.current = null;
        destMarkerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Theme switch: swap the whole basemap style; overlays re-attach via
    // the style.load listener registered at init
    useEffect(() => {
      if (!mapInstance || !isMapReady) return;
      mapInstance.setStyle(isDark ? DARK_STYLE : LIGHT_STYLE);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    // Crosshair cursor while picking a destination
    useEffect(() => {
      if (!mapInstance) return;
      mapInstance.getCanvas().style.cursor = isSelectingDestination
        ? "crosshair"
        : "";
    }, [isSelectingDestination, mapInstance]);

    // ------------------------------------------------------------------
    // Data → sources
    // ------------------------------------------------------------------
    useEffect(() => {
      geoJsonRef.current.havens = havensGeoJson;
      mapInstance?.getSource("havens")?.setData(havensGeoJson);
    }, [havensGeoJson, mapInstance, isMapReady]);

    useEffect(() => {
      geoJsonRef.current.threats = threatsGeoJson;
      mapInstance?.getSource("threats")?.setData(threatsGeoJson);
    }, [threatsGeoJson, mapInstance, isMapReady]);

    // ------------------------------------------------------------------
    // User marker (cone + dot/triangle) — real rotation via marker API
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapInstance;
      if (!map || !origin) return;
      if (!userMarkerRef.current) {
        userMarkerRef.current = new maplibregl.Marker({
          element: buildUserElement({
            userIconType,
            isNavigating,
            coneColor: colors?.userConeColor || "#1A73E8",
          }),
          rotationAlignment: "map",
          pitchAlignment: "map",
        })
          .setLngLat([origin.longitude, origin.latitude])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([origin.longitude, origin.latitude]);
      }
      userMarkerRef.current.setRotation(
        isNavigating ? navBearing : userHeading || 0,
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      origin?.latitude,
      origin?.longitude,
      userHeading,
      navBearing,
      isNavigating,
      mapInstance,
    ]);

    // Rebuild the user marker element when its appearance changes
    useEffect(() => {
      const marker = userMarkerRef.current;
      if (!marker) return;
      const fresh = buildUserElement({
        userIconType,
        isNavigating,
        coneColor: colors?.userConeColor || "#1A73E8",
      });
      marker.getElement().innerHTML = fresh.innerHTML;
    }, [userIconType, isNavigating, colors?.userConeColor]);

    // ------------------------------------------------------------------
    // Destination marker
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapInstance;
      if (!map) return;
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      if (!destination) return;

      const el = buildDestinationElement(colors);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (handlersRef.current.isSelectingDestination) return;
        setSelectedMarker({
          type: "destination",
          title: "Destination",
          color: colors?.neonOrange || "#FF9900",
          description: "Your selected destination",
        });
        setIsMarkerModalVisible(true);
      });
      destMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destination?.latitude, destination?.longitude, mapInstance, colors]);

    // ------------------------------------------------------------------
    // Routes (OSRM): dangerous = direct, safe/safeAlt = via haven waypoints
    // ------------------------------------------------------------------
    const originKey = origin
      ? `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`
      : "";
    const safeWaypointsKey = JSON.stringify(balancedSafeWaypoints);
    const altWaypointsKey = JSON.stringify(alternativeSafeWaypoints);

    useEffect(() => {
      const map = mapInstance;
      if (!map) return;

      const emptyLine = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] },
      };

      if (!destination || !origin) {
        routesRef.current = {};
        geoJsonRef.current.routes = {};
        ["dangerous", "safe", "safeAlt"].forEach((type) =>
          map.getSource(`route-${type}`)?.setData(emptyLine),
        );
        return;
      }

      let cancelled = false;
      const load = async () => {
        const definitions = [
          ["dangerous", [origin, destination]],
          ["safe", balancedSafeWaypoints],
          ["safeAlt", alternativeSafeWaypoints],
        ];
        // Direct route length, used to cap how much detour a "safe" route
        // may add before we drop haven waypoints (keeps demo routes short)
        let directKm = null;
        const detourBudget = () =>
          directKm != null ? directKm * 1.35 + 0.15 : Infinity;

        // Geometries already drawn — used to guarantee the three routes
        // never end up as the same overlapping line with the same length
        const geomKey = (r) => JSON.stringify(r.geometry.coordinates);
        const usedGeoms = new Set();

        // Fetch a route, dropping waypoints while it's over budget — but
        // always keeping at least ONE waypoint for safe routes
        const fetchTrimmed = async (routePoints, isSafe) => {
          let pts = routePoints;
          let route = await fetchOsrmRoute(pts);
          while (
            !cancelled &&
            isSafe &&
            route.distanceKm > detourBudget() &&
            pts.length > 3
          ) {
            pts = [...pts.slice(0, pts.length - 2), pts[pts.length - 1]];
            route = await fetchOsrmRoute(pts);
          }
          return route;
        };

        // Fetch a safe route; if OSRM snaps it onto a line we already
        // drew (identical geometry = identical length), retry with other
        // nearby havens until it's visibly distinct
        const fetchDistinct = async (waypoints) => {
          let route = await fetchTrimmed(
            [origin, ...waypoints, destination],
            true,
          );
          if (!usedGeoms.has(geomKey(route))) return route;

          let tries = 0;
          for (const candidate of distinctCandidatePool) {
            if (cancelled || tries >= 3) break;
            const alreadyUsed = waypoints.some(
              (w) =>
                w.latitude === candidate.latitude &&
                w.longitude === candidate.longitude,
            );
            if (alreadyUsed) continue;
            tries += 1;
            const retry = await fetchTrimmed(
              [origin, candidate, destination],
              true,
            );
            if (!usedGeoms.has(geomKey(retry))) return retry;
          }
          return route; // road network offers nothing more distinct
        };

        // Sequential on purpose — the public OSRM demo server rate-limits
        for (const [type, pointsOrWaypoints] of definitions) {
          try {
            let route;
            if (type === "dangerous") {
              route = await fetchTrimmed(pointsOrWaypoints, false);
              directKm = route.distanceKm;
            } else {
              route = await fetchDistinct(pointsOrWaypoints);
            }
            if (cancelled) return;
            usedGeoms.add(geomKey(route));
            routesRef.current[type] = route;
            const feature = {
              type: "Feature",
              geometry: route.geometry,
            };
            geoJsonRef.current.routes[type] = feature;
            map.getSource(`route-${type}`)?.setData(feature);

            if (selectedRouteTypeRef.current === type) {
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
        if (!cancelled) applyRouteStyling(map);
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
      mapInstance,
      isMapReady,
    ]);

    // Restyle lines + push the right step list when the selection changes
    useEffect(() => {
      if (!mapInstance || !isMapReady) return;
      applyRouteStyling(mapInstance);
      if (routesRef.current[selectedRouteType]) {
        onRouteStepsUpdate?.(routesRef.current[selectedRouteType].steps);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRouteType, mapInstance, isMapReady]);

    // ------------------------------------------------------------------
    // Camera behavior
    // ------------------------------------------------------------------
    // Route overview when a destination is set
    useEffect(() => {
      const map = mapInstance;
      if (!map || !destination || isNavigating) return;
      // Cancel any active animation to prevent overlap
      if (activeAnimationRef.current) {
        map.stop();
        activeAnimationRef.current = null;
      }
      try {
        activeAnimationRef.current = { type: "routeOverview" };
        const bounds = new maplibregl.LngLatBounds(
          [origin.longitude, origin.latitude],
          [origin.longitude, origin.latitude],
        );
        bounds.extend([destination.longitude, destination.latitude]);
        map.fitBounds(bounds, {
          padding: { top: 130, bottom: 280, left: 60, right: 60 },
          maxZoom: 17,
          duration: 900,
          pitch: 0,
          bearing: 0,
        });
      } catch (err) {
        console.error("Error in routeOverview:", err);
        activeAnimationRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      destination?.latitude,
      destination?.longitude,
      isNavigating,
      mapInstance,
      isMapReady,
    ]);

    // First-person follow camera during navigation — a real pitched,
    // heading-up camera this time, courtesy of MapLibre
    useEffect(() => {
      const map = mapInstance;
      if (!map || !origin || !isMapReady) return;

      if (isNavigating) {
        wasNavigatingRef.current = true;
        // Cancel any active animation to prevent overlap
        if (activeAnimationRef.current) {
          map.stop();
          activeAnimationRef.current = null;
        }
        try {
          activeAnimationRef.current = { type: "navigation" };
          map.easeTo({
            center: [origin.longitude, origin.latitude],
            zoom: NAV_CAMERA.zoom,
            pitch: NAV_CAMERA.pitch,
            bearing: navBearing,
            // Push the camera target up-screen so the user sits low, like
            // Waze/Google Maps navigation
            offset: [0, map.getContainer().clientHeight * 0.18],
            duration: NAV_CAMERA.duration,
            essential: true,
          });
        } catch (err) {
          console.error("Error in navigation camera:", err);
          activeAnimationRef.current = null;
        }
      } else if (wasNavigatingRef.current) {
        wasNavigatingRef.current = false;
        // Cancel any active animation to prevent overlap
        if (activeAnimationRef.current) {
          map.stop();
          activeAnimationRef.current = null;
        }
        try {
          activeAnimationRef.current = { type: "exitNavigation" };
          map.easeTo({ pitch: 0, bearing: 0, zoom: 16, duration: 700 });
        } catch (err) {
          console.error("Error exiting navigation:", err);
          activeAnimationRef.current = null;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      isNavigating,
      origin?.latitude,
      origin?.longitude,
      navBearing,
      mapInstance,
      isMapReady,
    ]);

    // ------------------------------------------------------------------
    // Ref API — react-native-maps compatible + web-only control methods
    // ------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        fitToCoordinates: (coordinates = [], options = {}) => {
          const map = mapRef.current;
          if (!map || coordinates.length === 0) return;
          // Cancel any active animation to prevent overlap
          if (activeAnimationRef.current) {
            map.stop();
            activeAnimationRef.current = null;
          }
          try {
            activeAnimationRef.current = { type: "fitToCoordinates" };
            const bounds = new maplibregl.LngLatBounds(
              [coordinates[0].longitude, coordinates[0].latitude],
              [coordinates[0].longitude, coordinates[0].latitude],
            );
            coordinates.forEach((c) =>
              bounds.extend([c.longitude, c.latitude]),
            );
            const pad = options.edgePadding || {};
            map.fitBounds(bounds, {
              padding: {
                top: pad.top ?? 60,
                bottom: pad.bottom ?? 60,
                left: pad.left ?? 60,
                right: pad.right ?? 60,
              },
              duration: options.animated === false ? 0 : 800,
            });
          } catch (err) {
            console.error("Error in fitToCoordinates:", err);
            activeAnimationRef.current = null;
          }
        },
        animateCamera: (camera = {}, options = {}) => {
          const map = mapRef.current;
          if (!map) return;
          // Cancel any active animation to prevent overlap
          if (activeAnimationRef.current) {
            map.stop();
            activeAnimationRef.current = null;
          }
          try {
            activeAnimationRef.current = { type: 'animateCamera' };
            // Only include keys that have real values: MapLibre's easeTo
            // uses `'zoom' in options` checks, so a key that is explicitly
            // undefined gets coerced to NaN and permanently corrupts the
            // camera transform (blank, unresponsive map).
            const opts = { duration: options.duration ?? 600 };
            if (camera.center) {
              opts.center = [camera.center.longitude, camera.center.latitude];
            }
            if (camera.zoom != null) opts.zoom = Math.min(camera.zoom, 19);
            if (camera.pitch != null) opts.pitch = Math.min(camera.pitch, 70);
            if (camera.heading != null) opts.bearing = camera.heading;
            map.easeTo(opts);
          } catch (err) {
            console.error("Error in animateCamera:", err);
            activeAnimationRef.current = null;
          }
        },
        animateToRegion: (region, duration = 500) => {
          const map = mapRef.current;
          if (!map || !region) return;
          // Cancel any active animation to prevent overlap
          if (activeAnimationRef.current) {
            map.stop();
            activeAnimationRef.current = null;
          }
          try {
            activeAnimationRef.current = { type: 'animateToRegion' };
            // Same NaN guard as animateCamera: never pass undefined keys
            const opts = {
              center: [region.longitude, region.latitude],
              duration,
            };
            if (region.latitudeDelta) {
              opts.zoom = Math.min(Math.log2(360 / region.latitudeDelta), 19);
            }
            map.easeTo(opts);
          } catch (err) {
            console.error("Error in animateToRegion:", err);
            activeAnimationRef.current = null;
          }
        },
        zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
        zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
        resetNorth: () =>
          mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 }),
        getBearing: () => mapRef.current?.getBearing() ?? 0,
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

    return (
      <View style={styles.container}>
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        />
        <LoadingOverlay visible={!isMapReady} colors={colors} />
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
