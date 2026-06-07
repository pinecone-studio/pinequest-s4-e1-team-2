import { RecognizeScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function RecognizePage() {
  return <RecognizeScreen onBack={() => router.replace('/home')} />
}
