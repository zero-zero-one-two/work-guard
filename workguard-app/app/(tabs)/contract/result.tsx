import { StyleSheet, Text, View } from 'react-native';

import { ContractLayout } from '@/components/contract/contract-layout';

export default function ContractResultScreen() {
  return (
    <ContractLayout step={3} rightAction="save">
      <View style={styles.placeholder}>
        <Text style={styles.text}>분석 결과 화면 (이슈 #15에서 구현)</Text>
      </View>
    </ContractLayout>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: '#687076',
  },
});
