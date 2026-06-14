import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/ui-generated/_comps';
import * as Location from 'expo-location';
import { speech } from '@/src/voice';
import { getAllStopsWithRoutes, type BusStopGroup } from '@/services/busApi';

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NearbyStop extends BusStopGroup {
  distance: number;
  lat: number;
  lon: number;
}

export default function NearbyStopsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [error, setError] = useState('');

  const findNearby = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Байршлын зөвшөөрөл шаардлагатай');
        speech.speak('Байршлын зөвшөөрөл шаардлагатай');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      const allStops = await getAllStopsWithRoutes();

      // Filter stops that have coordinates (busStopId contains lat/lon info from group endpoint)
      // The group endpoint doesn't have gpxX/gpxY, so we need to use searchStations
      // Actually, we'll compute distance for all and sort
      // BusStopGroup doesn't have coords directly, but we can get them from the API
      // For now, let's use the bus_station_list with empty keyword to get all stops with coords

      // getAllStopsWithRoutes returns BusStopGroup[] without coords
      // We need a different approach - search nearby using the station list
      const { searchStations } = await import('@/services/busApi');

      // Search with common Mongolian stop name prefixes to get stops with coordinates
      const results = await searchStations('');

      const nearby: NearbyStop[] = results
        .filter(s => s.gpxX && s.gpxY)
        .map(s => {
          const lat = parseFloat(s.gpxY);
          const lon = parseFloat(s.gpxX);
          const distance = haversineM(latitude, longitude, lat, lon);
          // Find matching group info for route list
          const group = allStops.find(g => g.busStopId === s.busStopId);
          return {
            busStopId: s.busStopId,
            busStopName: s.busStopName,
            routeList: group?.routeList ?? null,
            distance,
            lat,
            lon,
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15);

      setStops(nearby);

      if (nearby.length > 0) {
        const closest = nearby[0];
        const distText = closest.distance < 1000
          ? `${Math.round(closest.distance)} метр`
          : `${(closest.distance / 1000).toFixed(1)} километр`;
        speech.speak(`Хамгийн ойр буудал ${closest.busStopName}, ${distText} зайтай`);
      } else {
        speech.speak('Ойролцоо буудал олдсонгүй');
      }
    } catch (err) {
      console.warn('[NearbyStops] error:', err);
      setError('Буудал хайхад алдаа гарлаа');
      speech.speak('Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      speech.speak('Ойролцоох буудлуудыг хайж байна');
    }, 500);
    findNearby();
  }, []);

  function formatDist(m: number) {
    return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`;
  }

  return (
    <View style={s.root}>
      <BackButton onBack={() => router.back()} style={s.backBtn} />

      <Text style={s.title}>Ойролцоох буудлууд</Text>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={s.loadText}>Хайж байна...</Text>
        </View>
      )}

      {error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={findNearby}>
            <Text style={s.retryText}>Дахин оролдох</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && (
        <FlatList
          data={stops}
          keyExtractor={item => item.busStopId}
          style={s.list}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={s.stopCard}
              onPress={() => {
                speech.speak(`${item.busStopName}, ${formatDist(item.distance)} зайтай`);
              }}
              onLongPress={() => {
                router.push({
                  pathname: '/bus-route',
                  params: { prefillTo: item.busStopName },
                } as any);
              }}
            >
              <View style={s.stopHeader}>
                <Text style={s.stopIndex}>{index + 1}</Text>
                <View style={s.stopInfo}>
                  <Text style={s.stopName}>{item.busStopName}</Text>
                  {item.routeList && item.routeList.length > 0 && (
                    <Text style={s.routeText}>
                      {item.routeList.map(r => r.busRouteNo).join(', ')}
                    </Text>
                  )}
                </View>
                <Text style={s.distText}>{formatDist(item.distance)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Буудал олдсонгүй</Text>
            </View>
          }
        />
      )}

      {!loading && (
        <TouchableOpacity style={s.refreshBtn} onPress={findNearby}>
          <Text style={s.refreshText}>ШИНЭЧЛЭХ</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingTop: 60, paddingHorizontal: 16 },
  backBtn: {
    position: 'absolute', top: 50, left: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 30, marginBottom: 20 },
  center: { alignItems: 'center', paddingVertical: 40 },
  loadText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 12 },
  errorText: { color: '#FF9800', fontSize: 18, fontWeight: '600' },
  retryBtn: { backgroundColor: '#1E88E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  list: { flex: 1 },
  stopCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center' },
  stopIndex: { color: '#1E88E5', fontSize: 20, fontWeight: 'bold', width: 32 },
  stopInfo: { flex: 1 },
  stopName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  routeText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  distText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 18 },
  refreshBtn: {
    backgroundColor: '#1E88E5', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 30, marginTop: 12,
  },
  refreshText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
