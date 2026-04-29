import { StyleSheet, Text, View } from 'react-native';

import { ContractLayout } from '@/components/contract/contract-layout';

export default function ContractUploadScreen() {
  return (
    <ContractLayout step={1} rightAction="close">
      <View style={styles.placeholder}>
        <Text style={styles.text}>계약서 등록 화면 (이슈 #12에서 구현)</Text>
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
