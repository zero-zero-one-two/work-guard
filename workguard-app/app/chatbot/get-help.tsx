import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const CENTERS = [
  {
    id: '1',
    name: '고용노동부 고객상담센터',
    desc: '임금, 근로계약, 부당해고 등 노동 관련 전반 상담',
    tags: ['Call', 'Chat'],
  },
  {
    id: '2',
    name: '외국인력지원센터',
    desc: '이주 노동자 대상 노동권 상담 및 법률 지원',
    tags: ['Call', 'Chat'],
  },
];

export default function GetHelpScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get Help</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Expert Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>This needs an expert</Text>
          <Text style={styles.bannerDesc}>
            A labor counselor can help you file a complaint – for free.
          </Text>
        </View>

        {/* Center Cards */}
        {CENTERS.map(center => (
          <View key={center.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{center.name}</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Free</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>{center.desc}</Text>
            <View style={styles.tagRow}>
              {center.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaText}>Save chat & prepare case</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  banner: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  bannerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  cardDesc: {
    fontSize: 13,
    color: '#687076',
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: Brand.primary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  ctaButton: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
