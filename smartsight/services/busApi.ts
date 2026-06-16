const BASE = 'https://gateway.hamuga.mn/transport';
const API_KEY = process.env.EXPO_PUBLIC_HAMUGA_API_KEY ?? '';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { 'x-api-key': API_KEY } });
  // 401/429 = ачаалал/лимит, 5xx = серверийн алдаа — чимээгүй undefined биш, тодорхой алдаа
  if (res.status === 401 || res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
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

// Том, статик өгөгдлийг сесс бүрт нэг л удаа татаж кэшлэнэ (rate-limit-аас сэргийлнэ)
let _groupsCache: BusStopGroup[] | null = null;
let _stationsCache: BusStop[] | null = null;

/** Бүх буудал + тэдгээрээр дайрах чиглэлүүд (кэштэй) */
export async function getAllStopsWithRoutes(): Promise<BusStopGroup[]> {
  if (_groupsCache) return _groupsCache;
  _groupsCache = await get<BusStopGroup[]>('/api/bus/v1/group/info');
  return _groupsCache;
}

/** Тухайн буудлаар дайрах чиглэлүүд */
export async function getRoutesByStop(stopId: string): Promise<RouteShort[]> {
  return get('/api/bus/v1/bus_route_by_stop_id', { stop_id: stopId });
}

/** Тухайн чиглэлийн буудлууд (статик тул кэшлэнэ) */
const _routeStopsCache = new Map<string, { busRouteInfo: any; reverseRotStopList: StopOnRoute[] }>();
export async function getStopsByRoute(routeId: string): Promise<{ busRouteInfo: any; reverseRotStopList: StopOnRoute[] }> {
  const cached = _routeStopsCache.get(routeId);
  if (cached) return cached;
  const data = await get<{ busRouteInfo: any; reverseRotStopList: StopOnRoute[] }>('/api/bus/v1/rot_stop_by_route', { route_id: routeId });
  _routeStopsCache.set(routeId, data);
  return data;
}

/** Буудлын жагсаалт (keyword хайлттай) */
export async function searchStations(keyword: string): Promise<BusStop[]> {
  return get('/api/bus/v1/bus_station_list', { keyword, page: '1', perPage: '50' });
}

/** Бүх буудал координаттайгаар (нийт ~1451, кэштэй) */
export async function getAllStations(): Promise<BusStop[]> {
  if (_stationsCache) return _stationsCache;
  _stationsCache = await get<BusStop[]>('/api/bus/v1/bus_station_list', { keyword: '', page: '1', perPage: '5000' });
  return _stationsCache;
}

// ── Надтай ойр буудлаас очих газар руу ШУУД чиглэл ──────────────────────────

export interface NearbyDirectRoute {
  boardStop: BusStop;                                  // суух буудал
  walkMeters: number;                                  // надаас тэр буудал хүртэл
  routes: { busRouteId: string; busRouteNo: string }[]; // шууд явдаг автобусууд
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Надтай хамгийн ойр `nearestCount` буудлыг авч, тэдгээрийн дотроос очих газар руу ШУУД
 * явдаг буудлыг л харуулна. Байхгүй бол хоосон (дамжлага хэрэгтэй гэсэн үг).
 */
export async function findDirectRoutesToDestination(
  myLat: number,
  myLon: number,
  dest: BusStop,
  nearestCount = 5,
): Promise<NearbyDirectRoute[]> {
  const [stations, groups] = await Promise.all([getAllStations(), getAllStopsWithRoutes()]);
  const routeMap = new Map(groups.map((g) => [g.busStopId, g.routeList ?? []]));

  // Очих газрыг жинхэнэ буудал руу хувиргана (түгээмэл буудлын ID хуурамч байж болзошгүй)
  let destStopId = dest.busStopId;
  if ((routeMap.get(destStopId) ?? []).length === 0) {
    const dLat = parseFloat(dest.gpxY);
    const dLon = parseFloat(dest.gpxX);
    let best: { id: string; d: number } | null = null;
    for (const s of stations) {
      if (!s.gpxX || !s.gpxY || (routeMap.get(s.busStopId) ?? []).length === 0) continue;
      const d = haversineM(dLat, dLon, parseFloat(s.gpxY), parseFloat(s.gpxX));
      if (!best || d < best.d) best = { id: s.busStopId, d };
    }
    if (best) destStopId = best.id;
  }

  const destRouteIds = new Set((routeMap.get(destStopId) ?? []).map((r) => r.busRouteId));
  if (destRouteIds.size === 0) return [];

  // Надтай хамгийн ойр N буудал
  const nearest = stations
    .filter((s) => s.busStopId !== destStopId && s.gpxX && s.gpxY)
    .map((s) => ({ stop: s, dist: haversineM(myLat, myLon, parseFloat(s.gpxY), parseFloat(s.gpxX)) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, nearestCount);

  // Эдгээрийн дотроос очих газар руу шууд явдаг (зөв чиглэлтэй) буудлыг л үлдээнэ
  const results: NearbyDirectRoute[] = [];
  for (const { stop, dist } of nearest) {
    const direct = (routeMap.get(stop.busStopId) ?? []).filter((r) => destRouteIds.has(r.busRouteId));
    if (direct.length === 0) continue;
    const valid: { busRouteId: string; busRouteNo: string }[] = [];
    for (const r of direct) {
      const stopsList = (await getStopsByRoute(r.busRouteId)).reverseRotStopList ?? [];
      const bi = stopsList.findIndex((s) => s.busStopId === stop.busStopId);
      const di = stopsList.findIndex((s) => s.busStopId === destStopId);
      if (bi >= 0 && di >= 0 && bi >= di) continue; // тодорхой буруу чиг — хасна
      valid.push(r);
    }
    if (valid.length > 0) results.push({ boardStop: stop, walkMeters: dist, routes: valid });
  }
  console.log(
    `[BUS] dest=${destStopId} destRoutes=${destRouteIds.size} checked=${nearest.length} ` +
    `nearest="${nearest[0]?.stop.busStopName}"@${Math.round(nearest[0]?.dist ?? 0)}m results=${results.length}`,
  );
  return results;
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
  startTime?: number;
  endTime?: number;
}

export interface Itinerary {
  duration: number;       // total seconds
  walkTime: number;
  transitTime: number;
  transfers: number;
  startTime?: number;
  endTime?: number;
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
