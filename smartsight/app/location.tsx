import { LocationScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function LocationPage() {
  return <LocationScreen onBack={() => router.replace('/home')} />
}
