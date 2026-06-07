import { OcrScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function OcrPage() {
  return <OcrScreen onBack={() => router.replace('/home')} />
}
