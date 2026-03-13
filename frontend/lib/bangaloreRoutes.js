// Real Bangalore locations with lat/lng
// Route: Majestic → Victoria Hospital (busy city center corridor)

export const BANGALORE_ROUTES = {
  route1: {
    name: "Majestic → Victoria Hospital",
    origin: { name: "Kempegowda Bus Stand (Majestic)", lat: 12.9775, lng: 77.5713 },
    destination: { name: "Victoria Hospital", lat: 12.9634, lng: 77.5762 },
    waypoints: [
      { lat: 12.9775, lng: 77.5713, name: "Majestic",           intersection: "Gubbi Thotadappa Rd" },
      { lat: 12.9755, lng: 77.5728, name: "City Market Signal", intersection: "K.G. Road" },
      { lat: 12.9730, lng: 77.5740, name: "Mysore Bank Circle", intersection: "Mysore Rd Junction" },
      { lat: 12.9710, lng: 77.5748, name: "Chamrajpet Signal",  intersection: "Chamrajpet Cross" },
      { lat: 12.9690, lng: 77.5755, name: "Nagarthpet Cross",   intersection: "Nagarthpet Rd" },
      { lat: 12.9660, lng: 77.5760, name: "Cubbonpet Signal",   intersection: "Cubbonpet Main" },
      { lat: 12.9634, lng: 77.5762, name: "Victoria Hospital",  intersection: "Hospital Gate" },
    ],
  },
  route2: {
    name: "Hebbal → Manipal Hospital",
    origin: { name: "Hebbal Flyover", lat: 13.0358, lng: 77.5970 },
    destination: { name: "Manipal Hospital (HAL)", lat: 12.9592, lng: 77.6474 },
    waypoints: [
      { lat: 13.0358, lng: 77.5970, name: "Hebbal",              intersection: "Outer Ring Rd" },
      { lat: 13.0200, lng: 77.6050, name: "Nagawara Junction",   intersection: "Nagawara Main" },
      { lat: 13.0050, lng: 77.6150, name: "Kalyan Nagar Signal", intersection: "HRBR Layout" },
      { lat: 12.9900, lng: 77.6250, name: "Indiranagar 100ft",   intersection: "100 Feet Rd" },
      { lat: 12.9750, lng: 77.6350, name: "Domlur Signal",       intersection: "Domlur Flyover" },
      { lat: 12.9650, lng: 77.6430, name: "HAL Old Airport",     intersection: "HAL Rd" },
      { lat: 12.9592, lng: 77.6474, name: "Manipal Hospital",    intersection: "Hospital Gate" },
    ],
  },
  route3: {
    name: "Electronic City → Narayana Health",
    origin: { name: "Electronic City Phase 1", lat: 12.8399, lng: 77.6770 },
    destination: { name: "Narayana Health City", lat: 12.8943, lng: 77.5977 },
    waypoints: [
      { lat: 12.8399, lng: 77.6770, name: "E-City Phase 1",      intersection: "Hosur Rd" },
      { lat: 12.8500, lng: 77.6650, name: "Bommanahalli Signal",  intersection: "Bommanahalli" },
      { lat: 12.8620, lng: 77.6520, name: "BTM Layout Signal",    intersection: "BTM 2nd Stage" },
      { lat: 12.8750, lng: 77.6300, name: "Jayanagar 9th Block",  intersection: "9th Block Cross" },
      { lat: 12.8850, lng: 77.6150, name: "Banashankari Signal",  intersection: "Banashankari Temple" },
      { lat: 12.8900, lng: 77.6050, name: "Uttarahalli Cross",    intersection: "Uttarahalli Rd" },
      { lat: 12.8943, lng: 77.5977, name: "Narayana Health",      intersection: "Hospital Gate" },
    ],
  },
};

export const DEFAULT_ROUTE = "route1";