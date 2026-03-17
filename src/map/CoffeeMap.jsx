import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents } from "react-leaflet";

import { fetchCoffeeShops } from "../services/overpass";
import { aggregateHexes, hexToPolygon, generateCityHexGrid } from "../utils/h3Utils";

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

export default function CoffeeMap() {
  const [mounted, setMounted] = useState(false);
  const [hexes, setHexes] = useState([]);
  const [cafes, setCafes] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sfPolygon = [
        [-122.52, 37.70],
        [-122.35, 37.70],
        [-122.35, 37.83],
        [-122.52, 37.83],
        [-122.52, 37.70]
    ];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchCoffeeShops();
        if (cancelled) return;
        setCafes(data);

        const resolution = 9;
        const counts = aggregateHexes(data, resolution);
        const gridCells = generateCityHexGrid(sfPolygon, resolution);
        const hexData = gridCells.map((cell) => ({
          polygon: hexToPolygon(cell),
          count: counts[cell] || 0,
        }));
        setHexes(hexData);
      } catch (err) {
        console.error("Failed to load coffee shops:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function updateHexes(polygon) {
    if (!cafes.length) return;

        const resolution = 8;

        const counts = aggregateHexes(cafes, resolution);

        const gridCells = generateCityHexGrid(polygon, resolution);

        const hexData = gridCells.map(cell => ({
            polygon: hexToPolygon(cell),
            count: counts[cell] || 0
        }));

        setHexes(hexData);
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
      
      <MapWatcher onMove={updateHexes} />

      {hexes.map((h, i) => (
        <Polygon
          key={i}
          positions={h.polygon}
          pathOptions={{
            color: getColor(h.count),
            fillOpacity: 0.6
          }}
        />
      ))}

    </MapContainer>

  );
}