import { HomeScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function HomePage() {
  return (
    <HomeScreen
      onNav={(id) => router.push(`/${id}`)}
    />
  )
}
