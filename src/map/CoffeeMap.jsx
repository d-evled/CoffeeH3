import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Popup, Tooltip, useMapEvents } from "react-leaflet";

import { fetchCoffeeShops } from "../services/overpass";
import { aggregateHexes, groupPointsByHex, hexToPolygon, generateCityHexGrid } from "../utils/h3Utils";

function MapWatcher({ onMove }) {
  useMapEvents({
    moveend(e) {
      const bounds = e.target.getBounds();

      const polygon = [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
        [bounds.getWest(), bounds.getNorth()],
        [bounds.getWest(), bounds.getSouth()]
      ];

      onMove(polygon);
    }
  });

  return null;
}

const CITIES = [
  {
    id: "sf",
    name: "San Francisco, CA",
    center: [37.7749, -122.4194],
    bounds: { south: 37.7081, west: -122.5149, north: 37.8324, east: -122.357 },
  },
  {
    id: "nyc",
    name: "New York, NY",
    center: [40.7128, -74.006],
    bounds: { south: 40.4774, west: -74.2591, north: 40.9176, east: -73.7004 },
  },
  {
    id: "la",
    name: "Los Angeles, CA",
    center: [34.0522, -118.2437],
    bounds: { south: 33.7037, west: -118.6682, north: 34.3373, east: -118.1553 },
  },
  {
    id: "chicago",
    name: "Chicago, IL",
    center: [41.8781, -87.6298],
    bounds: { south: 41.6443, west: -87.9401, north: 42.023, east: -87.5237 },
  },
  {
    id: "houston",
    name: "Houston, TX",
    center: [29.7604, -95.3698],
    bounds: { south: 29.5223, west: -95.8233, north: 30.1105, east: -95.0146 },
  },
  {
    id: "phoenix",
    name: "Phoenix, AZ",
    center: [33.4484, -112.074],
    bounds: { south: 33.2903, west: -112.3241, north: 33.9208, east: -111.9258 },
  },
];

const MIN_RESOLUTION = 5;
const MAX_RESOLUTION = 10;

export default function CoffeeMap() {
  const [mounted, setMounted] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState(CITIES[0].id);
  const [hexes, setHexes] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [resolution, setResolution] = useState(8);
  const [lastBounds, setLastBounds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCity = CITIES.find((city) => city.id === selectedCityId) || CITIES[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchCoffeeShops(selectedCity.bounds);
        if (cancelled) return;
        setCafes(data);
        setLastBounds([
          [selectedCity.bounds.west, selectedCity.bounds.south],
          [selectedCity.bounds.east, selectedCity.bounds.south],
          [selectedCity.bounds.east, selectedCity.bounds.north],
          [selectedCity.bounds.west, selectedCity.bounds.north],
          [selectedCity.bounds.west, selectedCity.bounds.south],
        ]);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load coffee shops:", err);
        setError("Failed to load coffee shops for this city. Please try again.");
        setCafes([]);
        setHexes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedCity]);

  useEffect(() => {
    if (!lastBounds) return;

    const counts = aggregateHexes(cafes, resolution);
    const cafesByCell = groupPointsByHex(cafes, resolution);
    const gridCells = generateCityHexGrid(lastBounds, resolution);
    const hexData = gridCells.map((cell) => ({
      id: cell,
      polygon: hexToPolygon(cell),
      count: counts[cell] || 0,
      cafes: cafesByCell[cell] || [],
    }));
    setHexes(hexData);
  }, [cafes, resolution, lastBounds]);

  function handleMapMove(polygon) {
    setLastBounds(polygon);
  }

  function getColor(count) {
        if (count === 0) return "#eeeeee";
        if (count > 10) return "#800026";
        if (count > 5) return "#BD0026";
        if (count > 2) return "#E31A1C";

        return "#FFEDA0";
    }

  if (!mounted) {
    return (
      <div className="map-placeholder" style={{ height: "600px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading map…
      </div>
    );
  }

  return (
    <div className="coffee-map-wrapper">
      <div className="city-control">
        <label htmlFor="city-select">City</label>
        <select
          id="city-select"
          value={selectedCityId}
          onChange={(e) => setSelectedCityId(e.target.value)}
        >
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>
      <div className="resolution-control">
        <label htmlFor="resolution-slider">
          Hex resolution: <strong>{resolution}</strong>
          <span className="resolution-hint">
            ({MIN_RESOLUTION} = larger hexagons, {MAX_RESOLUTION} = smaller)
          </span>
        </label>
        <input
          id="resolution-slider"
          type="range"
          min={MIN_RESOLUTION}
          max={MAX_RESOLUTION}
          value={resolution}
          onChange={(e) => setResolution(Number(e.target.value))}
        />
      </div>
      <MapContainer
        key={selectedCity.id}
        center={selectedCity.center}
        zoom={12}
        style={{ height: "600px", width: "100%" }}
        className="coffee-map"
      >
        <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapWatcher onMove={handleMapMove} />

      {hexes.map((h) => (
        <Polygon
          key={h.id}
          positions={h.polygon}
          pathOptions={{
            color: getColor(h.count),
            fillOpacity: 0.6
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="hex-tooltip">
            <strong>Hex ID</strong>: {h.id}
            <br />
            <strong>Coffee shops</strong>: {h.count}
          </Tooltip>
          <Popup className="hex-popup">
            <div className="hex-popup-content">
              <strong>Hex ID</strong>: {h.id}
              <br />
              <strong>Coffee shops ({h.count})</strong>
              {h.cafes.length > 0 ? (
                <ul className="hex-cafe-list">
                  {h.cafes.map((cafe, i) => (
                    <li key={i}>{cafe.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="hex-cafe-empty">No coffee shops in this hex</p>
              )}
            </div>
          </Popup>
        </Polygon>
      ))}

      </MapContainer>
      {loading && <p className="map-status">Loading coffee shop data...</p>}
      {error && <p className="map-error">{error}</p>}
    </div>
  );
}