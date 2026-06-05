import { BigButton, Logo, Screen } from '@/components/ui-generated/_comps'
import { Text, View } from 'react-native'
import { router } from 'expo-router'

export default function RegisterPage() {
  return (
    <Screen style={{ justifyContent: 'center', gap: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Logo size={34} />
        <Text style={{ fontSize: 26, fontWeight: '700', marginTop: 18 }}>Шинэ хэрэглэгч</Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
          Танд Smart Sight програмын үндсэн функцуудтай танилцах боломж байна.
        </Text>
      </View>

      <BigButton
        label="Бүртгүүлэх"
        sub="Шинэ ашиглагч бол энд дарна уу"
        height={140}
        onPress={() => router.replace('/onboarding')}
      />
      <BigButton
        label="Буцах"
        height={92}
        onPress={() => router.back()}
      />
    </Screen>
  )
}
