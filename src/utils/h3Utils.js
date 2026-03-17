import { latLngToCell, cellToBoundary, polygonToCells } from "h3-js";

export function aggregateHexes(points, resolution = 9) {

  const counts = {};

  points.forEach(p => {

    const cell = latLngToCell(p.lat, p.lng, resolution);

    counts[cell] = (counts[cell] || 0) + 1;

  });

  return counts;
}

export function hexToPolygon(cell) {

  const boundary = cellToBoundary(cell);

  return boundary.map(([lat, lng]) => [lat, lng]);
}

export function generateCityHexGrid(polygon, resolution = 8) {

  const latLngPolygon = polygon.map(([lng, lat]) => [lat, lng]);

  return polygonToCells(latLngPolygon, resolution);
}