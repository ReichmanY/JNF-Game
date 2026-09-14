import L from "leaflet";
import "leaflet/dist/leaflet.css";

function pinIcon(kind) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin-${kind}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

export function createIsraelMap(el, mapConfig) {
  const bounds = L.latLngBounds(mapConfig.maxBounds);
  const map = L.map(el, {
    center: mapConfig.center,
    zoom: mapConfig.defaultZoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    maxBounds: bounds.pad(0.08),
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri",
    maxZoom: 16,
  }).addTo(map);

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
    map.setView(mapConfig.center, mapConfig.defaultZoom);
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
          { color: "#d4a017", weight: 3, dashArray: "8 8" }
        ).addTo(map);
        map.fitBounds(L.latLngBounds([guess.lat, guess.lng], [truth.lat, truth.lng]).pad(0.35), {
          maxZoom: 11,
        });
      } else {
        map.setView([truth.lat, truth.lng], 9);
      }
      setTimeout(() => map.invalidateSize(), 40);
    },
    invalidate() {
      setTimeout(() => {
        map.invalidateSize();
        map.setView(mapConfig.center, mapConfig.defaultZoom);
      }, 60);
    },
    destroy() {
      map.remove();
    },
  };
}
