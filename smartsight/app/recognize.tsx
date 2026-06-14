import RecognitionCamera from '@/components/Recognition'
import { useLocalSearchParams } from 'expo-router'

export default function RecognizePage() {
  const { targetRoom } = useLocalSearchParams<{ targetRoom?: string | string[] }>()
  const targetDoorNumber = Array.isArray(targetRoom) ? targetRoom[0] : targetRoom

  return <RecognitionCamera targetDoorNumber={targetDoorNumber} />
}
