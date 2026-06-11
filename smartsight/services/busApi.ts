const BASE = 'https://gateway.hamuga.mn/transport';
const API_KEY = process.env.EXPO_PUBLIC_HAMUGA_API_KEY ?? '';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { 'x-api-key': API_KEY } });
  const json = await res.json();
  if (json.status === false) throw new Error(json.msg?.[0] ?? 'API алдаа');
  return json.data;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface BusStop {
  busStopId: string;
  busStopName: string;
  gpxX: string;
  gpxY: string;
}

export interface BusStopGroup {
  busStopId: string;
  busStopName: string;
  routeList: { busRouteId: string; busRouteNo: string }[] | null;
}

export interface RouteShort {
  busRouteId: string;
  busRouteName: string;
  busRouteNo: string;
}

export interface StopOnRoute {
  busStopId: string;
  busStopName: string;
  busStopSeq: string;
  gpxX?: string;
  gpxY?: string;
}

// ── API calls ────────────────────────────────────────────────────────────────

/** Бүх буудал + тэдгээрээр дайрах чиглэлүүд */
export async function getAllStopsWithRoutes(): Promise<BusStopGroup[]> {
  return get('/api/bus/v1/group/info');
}

/** Тухайн буудлаар дайрах чиглэлүүд */
export async function getRoutesByStop(stopId: string): Promise<RouteShort[]> {
  return get('/api/bus/v1/bus_route_by_stop_id', { stop_id: stopId });
}

/** Тухайн чиглэлийн буудлууд */
export async function getStopsByRoute(routeId: string): Promise<{ busRouteInfo: any; reverseRotStopList: StopOnRoute[] }> {
  return get('/api/bus/v1/rot_stop_by_route', { route_id: routeId });
}

/** Буудлын жагсаалт (keyword хайлттай) */
export async function searchStations(keyword: string): Promise<BusStop[]> {
  return get('/api/bus/v1/bus_station_list', { keyword, page: '1', perPage: '50' });
}

// ── Чиглэл хайх логик ───────────────────────────────────────────────────────

export interface RouteResult {
  route: RouteShort;
  fromStop: string;
  toStop: string;
}

/**
 * A буудлаас B буудал руу ямар автобусанд суухыг олно.
 * Хоёр буудлаар хоёулаа дайрдаг чиглэлүүдийг буцаана.
 */
export async function findRoutes(fromStopId: string, toStopId: string): Promise<RouteResult[]> {
  const [fromRoutes, toRoutes] = await Promise.all([
    getRoutesByStop(fromStopId),
    getRoutesByStop(toStopId),
  ]);

  const toRouteIds = new Set(toRoutes.map(r => r.busRouteId));
  const common = fromRoutes.filter(r => toRouteIds.has(r.busRouteId));

  return common.map(route => ({
    route,
    fromStop: fromStopId,
    toStop: toStopId,
  }));
}

// ── Route Planning (OpenTripPlanner) ─────────────────────────────────────────

export interface ItineraryLeg {
  mode: string;           // "WALK" | "BUS"
  routeShortName?: string; // "Ч:32Б"
  routeLongName?: string;
  routeId?: string;        // "1:11100081"
  from: { name: string; stopId?: string };
  to: { name: string; stopId?: string };
  duration: number;        // seconds
  distance: number;        // meters
}

export interface Itinerary {
  duration: number;       // total seconds
  walkTime: number;
  transitTime: number;
  transfers: number;
  legs: ItineraryLeg[];
}

/**
 * Координатаар зам тооцоолно (OpenTripPlanner).
 * Шөнийн цагаар маршрут олдохгүй тул өглөөний 9:00 гэж зааж өгнө.
 */
export async function planRoute(fromLat: number, fromLon: number, toLat: number, toLon: number): Promise<Itinerary[]> {
  // Одоогийн цаг автобус явдаг цаг (06:00-22:00) мөн эсэхийг шалгах
  const now = new Date();
  const ubHour = (now.getUTCHours() + 8) % 24;
  const isBusHours = ubHour >= 6 && ubHour < 22;

  let timeParams = '';
  if (!isBusHours) {
    // Шөнийн цагаар маргааш өглөөний 8:00 гэж тооцоолно
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const yyyy = tomorrow.getFullYear();
    timeParams = `&date=${mm}-${dd}-${yyyy}&time=8:00am`;
  }

  const url = `https://gateway.hamuga.mn/route/routers/default/plan?fromPlace=${fromLat},${fromLon}&toPlace=${toLat},${toLon}${timeParams}`;
  const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
  const json = await res.json();
  if (json?.error) {
    console.warn('[BusAPI] route plan error:', json.error.message);
  }
  return json?.plan?.itineraries ?? [];
}

/**
 * Буудлын координатаар зам тооцоолно.
 */
export async function planRouteBetweenStops(from: BusStop, to: BusStop): Promise<Itinerary[]> {
  return planRoute(
    parseFloat(from.gpxY), parseFloat(from.gpxX),
    parseFloat(to.gpxY), parseFloat(to.gpxX),
  );
}
