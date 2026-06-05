import { LoginScreen } from '@/components/ui-generated/_comps'
import { router } from 'expo-router'

export default function LoginPage() {
  return (
    <LoginScreen
      onBack={() => router.back()}
      onLogin={() => router.replace('/home')}
    />
  )
}
