import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const CATEGORIES = [
  { label: '급여·수당', icon: 'cash-outline' as const },
  { label: '근로계약', icon: 'document-text-outline' as const },
  { label: '휴가·휴일', icon: 'calendar-outline' as const },
  { label: '산업재해', icon: 'medkit-outline' as const },
  { label: '해고·이직', icon: 'briefcase-outline' as const },
  { label: '기타', icon: 'ellipsis-horizontal-circle-outline' as const },
];

export default function ChatbotScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={styles.title}>Ask ChatBot</Text>

        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introMain}>Ask me anything about working in Korea</Text>
            <Text style={styles.introSub}>Answers are based on Korean labor law.</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.label}
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: '/chatbot/chat' as any, params: { category: cat.label } })}>
              <Ionicons name={cat.icon} size={22} color={Brand.primary} />
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    textAlign: 'center',
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF3FF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  introText: {
    flex: 1,
    gap: 4,
  },
  introMain: {
    fontSize: 13,
    fontWeight: '600',
    color: '#11181C',
  },
  introSub: {
    fontSize: 12,
    color: '#687076',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#687076',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#11181C',
    textAlign: 'center',
  },
});
