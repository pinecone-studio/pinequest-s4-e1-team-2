import { ObstacleScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function ObstaclePage() {
  return <ObstacleScreen onBack={() => router.replace('/home')} />
}
