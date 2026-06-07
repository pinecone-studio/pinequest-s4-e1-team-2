import { HomeScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

type HomeRoute = "obstacle" | "recognize" | "ocr" | "location" | "room-search";

export default function HomePage() {
  return (
    <HomeScreen
      onNav={(id: HomeRoute) => router.push(`/${id}`)}
    />
  )
}
