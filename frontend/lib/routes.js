// Bangalore hospital routes — only origin + destination.
// Google Maps Directions API computes the SHORTEST path automatically.

export const ROUTES = {
  route1: {
    name:        "Majestic → Victoria Hospital",
    origin:      { name: "Kempegowda Bus Stand (Majestic)", lat: 12.9775, lng: 77.5713 },
    destination: { name: "Victoria Hospital",               lat: 12.9634, lng: 77.5762 },
    etaStart:    420, // 7m normal traffic
    timeSaved:   210, // 3m 30s saved
  },
  route2: {
    name:        "Hebbal → Manipal Hospital",
    origin:      { name: "Hebbal Flyover",       lat: 13.0358, lng: 77.5970 },
    destination: { name: "Manipal Hospital (HAL)", lat: 12.9592, lng: 77.6474 },
    etaStart:    780, // 13m normal traffic
    timeSaved:   450, // 7.5m saved
  },
  route3: {
    name:        "Electronic City → Narayana Health",
    origin:      { name: "Electronic City Phase 1", lat: 12.8399, lng: 77.6770 },
    destination: { name: "Narayana Health City",    lat: 12.8943, lng: 77.5977 },
    etaStart:    900, // 15m normal traffic
    timeSaved:   520, // 8m 40s saved
  },
};

export const DEFAULT_ROUTE = "route1";
