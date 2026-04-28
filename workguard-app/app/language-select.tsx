import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const LANGUAGES = [
  { code: 'EN', name: 'English', greeting: 'Hello' },
  { code: 'KR', name: '한국어', greeting: '안녕하세요' },
  { code: 'VN', name: 'Tiếng Việt', greeting: 'Xin chào' },
  { code: 'TH', name: 'แบบไทย', greeting: 'สวัสดี' },
];

export default function LanguageSelect() {
  const [selected, setSelected] = useState('EN');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#11181C" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Please select your language</Text>
      </View>

      <View style={styles.list}>
        {LANGUAGES.map(lang => {
          const isSelected = selected === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(lang.code)}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{lang.code}</Text>
              </View>
              <Text style={styles.langName}>{lang.name}</Text>
              <Text style={styles.greeting}>{lang.greeting}</Text>
            </Pressable>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
    paddingHorizontal: 28,
  },
  backButton: {
    marginTop: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#11181C',
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
  },
  list: {
    flex: 1,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  cardSelected: {
    borderColor: Brand.primary,
    backgroundColor: '#EBF3FF',
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  langName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#11181C',
  },
  greeting: {
    fontSize: 14,
    color: '#687076',
  },
  continueButton: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
