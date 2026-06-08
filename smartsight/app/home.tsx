import { HomeScreen } from '@/components/ui-generated/_comps'
import { useRouter } from 'expo-router'

const ROUTES = {
  obstacle: "/obstacle",
  recognize: "/recognize",
  ocr: "/ocr",
  location: "/location",
  "room-search": "/room-search",
} as const

type HomeRoute = "obstacle" | "recognize" | "ocr" | "location" | "room-search";

export default function HomePage() {
  const router = useRouter()

  return (
    <HomeScreen
      onNav={(id) => router.push(ROUTES[id] as any)}
    />
  )
}
