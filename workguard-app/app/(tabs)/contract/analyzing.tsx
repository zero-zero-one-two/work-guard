import { StyleSheet, Text, View } from 'react-native';

import { ContractLayout } from '@/components/contract/contract-layout';

export default function ContractAnalyzingScreen() {
  return (
    <ContractLayout step={2} rightAction={null}>
      <View style={styles.placeholder}>
        <Text style={styles.text}>분석 진행 화면 (이슈 #14에서 구현)</Text>
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
