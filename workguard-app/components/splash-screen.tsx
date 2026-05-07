import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={80} color="white" />
        <Text style={styles.title}>WorkGuard</Text>
        <Text style={styles.subtitle}>Make your workplace safer</Text>
      </View>
      <Text style={styles.footer}>Powered by Korean Labor Standards</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});
