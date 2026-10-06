import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CITY_LABELS = [
  { name: "Tel Aviv", lat: 32.0853, lng: 34.7818 },
  { name: "Jerusalem", lat: 31.7683, lng: 35.2137 },
  { name: "Haifa", lat: 32.794, lng: 34.9896 },
];

function pinIcon(kind) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin-${kind}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

function cityIcon(name) {
  return L.divIcon({
    className: "city-label",
    html: `<i class="city-dot"></i><span>${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function createIsraelMap(el, mapConfig) {
  const bounds = L.latLngBounds(mapConfig.maxBounds);
  const map = L.map(el, {
    center: mapConfig.center,
    zoom: mapConfig.defaultZoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    maxBounds: bounds.pad(1.4),
    maxBoundsViscosity: 0,
    zoomControl: true,
    attributionControl: false,
    bounceAtZoomLimits: false,
    worldCopyJump: false,
    inertia: true,
    inertiaDeceleration: 3000,
    tap: false,
    tapTolerance: 25,
    touchZoom: true,
    scrollWheelZoom: true,
    keyboard: false,
  });

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri",
    maxZoom: 13,
  }).addTo(map);

  map.createPane("cityLabels");
  const cityPane = map.getPane("cityLabels");
  cityPane.style.zIndex = 450;
  cityPane.style.pointerEvents = "none";

  for (const city of CITY_LABELS) {
    L.marker([city.lat, city.lng], {
      icon: cityIcon(city.name),
      interactive: false,
      keyboard: false,
      pane: "cityLabels",
    }).addTo(map);
  }

  let guessMarker = null;
  let truthMarker = null;
  let line = null;
  let clickEnabled = true;
  let onGuess = () => {};

  map.on("click", (event) => {
    if (!clickEnabled) return;
    const { lat, lng } = event.latlng;
    if (guessMarker) {
      guessMarker.setLatLng([lat, lng]);
    } else {
      guessMarker = L.marker([lat, lng], { icon: pinIcon("guess"), draggable: true }).addTo(map);
      guessMarker.on("dragend", () => {
        const pos = guessMarker.getLatLng();
        onGuess({ lat: pos.lat, lng: pos.lng });
      });
    }
    onGuess({ lat, lng });
  });

  function resetView() {
    map.setView(mapConfig.center, mapConfig.defaultZoom, { animate: false });
  }

  return {
    setOnGuess(fn) {
      onGuess = fn;
    },
    setMarker(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (guessMarker) {
        guessMarker.setLatLng([lat, lng]);
      } else {
        guessMarker = L.marker([lat, lng], { icon: pinIcon("guess"), draggable: true }).addTo(map);
        guessMarker.on("dragend", () => {
          const pos = guessMarker.getLatLng();
          onGuess({ lat: pos.lat, lng: pos.lng });
        });
      }
      onGuess({ lat, lng });
    },
    enableClicks(enabled) {
      clickEnabled = enabled;
      if (guessMarker) guessMarker.dragging?.[enabled ? "enable" : "disable"]?.();
    },
    clearGuess() {
      if (guessMarker) {
        map.removeLayer(guessMarker);
        guessMarker = null;
      }
      if (truthMarker) {
        map.removeLayer(truthMarker);
        truthMarker = null;
      }
      if (line) {
        map.removeLayer(line);
        line = null;
      }
      resetView();
    },
    showResult(guess, truth) {
      clickEnabled = false;
      if (truthMarker) map.removeLayer(truthMarker);
      if (line) map.removeLayer(line);
      if (!guessMarker && guess) {
        guessMarker = L.marker([guess.lat, guess.lng], { icon: pinIcon("guess") }).addTo(map);
      }
      truthMarker = L.marker([truth.lat, truth.lng], { icon: pinIcon("truth") }).addTo(map);
      if (guess) {
        line = L.polyline(
          [
            [guess.lat, guess.lng],
            [truth.lat, truth.lng],
          ],
          { color: "#bb8100", weight: 3, dashArray: "8 8" }
        ).addTo(map);
        map.fitBounds(L.latLngBounds([guess.lat, guess.lng], [truth.lat, truth.lng]).pad(0.35), {
          maxZoom: 11,
          animate: false,
        });
      } else {
        map.setView([truth.lat, truth.lng], 9, { animate: false });
      }
      setTimeout(() => map.invalidateSize({ animate: false }), 40);
    },
    invalidate() {
      setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, 80);
    },
    destroy() {
      map.remove();
    },
  };
}
