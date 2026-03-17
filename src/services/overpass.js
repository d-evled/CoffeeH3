export async function fetchCoffeeShops() {

  const query = `
  [out:json];
  node["amenity"="cafe"](37.70,-122.52,37.83,-122.35);
  out;
  `;

  const res = await fetch(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      body: query
    }
  );

  const data = await res.json();

  return data.elements.map(cafe => ({
    lat: cafe.lat,
    lng: cafe.lon,
    name: cafe.tags?.name || "Unknown"
  }));
}