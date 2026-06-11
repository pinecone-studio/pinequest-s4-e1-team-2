import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BusStop } from './busApi';

const SAVED_ROUTES_KEY = '@smartsight/saved_routes';

export interface SavedRoute {
  id: string;
  name: string;
  from: BusStop;
  to: BusStop;
  createdAt: number;
}

export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveRoute(route: SavedRoute): Promise<void> {
  const existing = await getSavedRoutes();
  const filtered = existing.filter(r => r.id !== route.id);
  filtered.unshift(route);
  await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(filtered.slice(0, 20)));
}

export async function deleteSavedRoute(id: string): Promise<void> {
  const existing = await getSavedRoutes();
  await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(existing.filter(r => r.id !== id)));
}
