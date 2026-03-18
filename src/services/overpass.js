export async function fetchCoffeeShops(bounds) {
  const query = `
  [out:json][timeout:60];
  node["amenity"="cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  out;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status}`);
  }

  const data = await res.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  return elements
    .filter((cafe) => typeof cafe.lat === "number" && typeof cafe.lon === "number")
    .map((cafe) => ({
      lat: cafe.lat,
      lng: cafe.lon,
      name: cafe.tags?.name || "Unknown",
    }));
}