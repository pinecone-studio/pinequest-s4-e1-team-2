import { BigButton, Logo, Screen, VisionScreen } from '@/components/ui-generated/_comps'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
export default function Page() {
  return (
    <Screen style={{ justifyContent: 'center', gap: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Logo size={34} />
        <Text style={{ fontSize: 28, fontWeight: '700', marginTop: 18, textAlign: 'center' }}>
          Та Smart Sight хэрэглэгч мөн үү?
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10, textAlign: 'center', maxWidth: 300 }}>
          Бүртгэлтэй хэрэглэгч бол "Нэвтрэх", шинээр эхлэгч бол "Шинэ хэрэглэгч" товчийг дарна уу.
        </Text>
      </View>

      <BigButton
        label="Шинэ хэрэглэгч"
        sub="Бүртгэл үүсгэж эхлэх"
        height={132}
        onPress={() => router.push('/register')}
      />
      <BigButton
        label="Бүртгэлтэй"
        sub="Нэвтрэх"
        height={132}
        onPress={() => router.push('/login')}
      />
    </Screen>
  )
}