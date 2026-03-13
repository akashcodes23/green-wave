const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function postDispatch(origin, destination, routeKey) {
  const res = await fetch(`${API_URL}/dispatch`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ origin, destination, route_key: routeKey }),
  });
  if (!res.ok) throw new Error(`Dispatch failed: ${res.status}`);
  return res.json();
}

export async function postReset() {
  const res = await fetch(`${API_URL}/simulation/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
  return res.json();
}

export async function getAIEta() {
  const res = await fetch(`${API_URL}/ai/eta`);
  if (!res.ok) throw new Error(`AI ETA failed: ${res.status}`);
  return res.json();
}

export async function getCongestion() {
  const res = await fetch(`${API_URL}/ai/congestion`);
  if (!res.ok) throw new Error(`Congestion failed: ${res.status}`);
  return res.json();
}

export async function getRouteHistory() {
  const res = await fetch(`${API_URL}/history/routes`);
  if (!res.ok) throw new Error(`History failed: ${res.status}`);
  return res.json();
}

export async function ping() {
  try {
    const res = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}