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

const SF_POLYGON = [
  [-122.52, 37.7],
  [-122.35, 37.7],
  [-122.35, 37.83],
  [-122.52, 37.83],
  [-122.52, 37.7],
];

const MIN_RESOLUTION = 5;
const MAX_RESOLUTION = 10;

export default function CoffeeMap() {
  const [mounted, setMounted] = useState(false);
  const [hexes, setHexes] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [resolution, setResolution] = useState(8);
  const [lastBounds, setLastBounds] = useState(SF_POLYGON);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchCoffeeShops();
        if (cancelled) return;
        setCafes(data);
      } catch (err) {
        console.error("Failed to load coffee shops:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cafes.length) return;

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
        center={[37.7749, -122.4194]}
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
    </div>
  );
}