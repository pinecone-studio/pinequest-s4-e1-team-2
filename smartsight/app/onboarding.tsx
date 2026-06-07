import { Button, Logo } from '@/components/ui-generated/_comps'
import { Screen } from '@/components/Screen'
import { Text, View } from 'react-native'
import { router } from 'expo-router'

export default function OnboardingPage() {
  return (
    <Screen style={{ gap: 22 }}>
      <View style={{ alignItems: 'center' }}>
        <Logo size={34} />
        <Text style={{ fontSize: 28, fontWeight: '700', marginTop: 18, textAlign: 'center' }}>
          Smart Sight-д тавтай морил!
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 12, textAlign: 'center', maxWidth: 320 }}>
          Энэхүү аппликейшн нь саад мэдрэгч, таних систем, текст унших болон байршлын функцуудтай.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Та юу хийх боломжтой вэ?</Text>
        <Text style={{ color: '#444', lineHeight: 24 }}>
          • Саад мэдрэгчээр урд байгаа зүйлсийг таньж мэдэх
          {'\n'}• Камераар объект болон текст таних
          {'\n'}• Байршил тогтоох, орчинг ойлгох
        </Text>
      </View>

      <Button label="ҮРГЭЛЖЛҮҮЛЭХ" height={130} onPress={() => router.replace('/permission')} />
    </Screen>
  )
}
