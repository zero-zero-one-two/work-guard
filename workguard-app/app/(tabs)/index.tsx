import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const TODAY = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const SHORTCUTS = [
  {
    label: '계약서 분석',
    desc: '계약서를 사진으로 찍어\n위반 여부를 확인해요',
    icon: 'scan-outline' as const,
    color: Brand.primary,
    bg: '#EBF3FF',
    route: '/contract',
  },
  {
    label: '급여 캘린더',
    desc: '급여와 근무 일정을\n한눈에 관리해요',
    icon: 'calendar-outline' as const,
    color: '#16A34A',
    bg: '#DCFCE7',
    route: '/(tabs)/salary-calendar',
  },
  {
    label: '챗봇',
    desc: '노동법 관련\n궁금한 점을 물어봐요',
    icon: 'chatbubble-ellipses-outline' as const,
    color: '#D97706',
    bg: '#FEF3C7',
    route: '/(tabs)/chatbot',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Brand.primary} />
              <Text style={styles.logoText}>WorkGuard</Text>
            </View>
            <Text style={styles.dateText}>{TODAY}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.fontSizeText}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={22} color="#11181C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* This Week Card */}
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>THIS WEEK</Text>
          <Text style={styles.weekAmount}>₩ 486,000</Text>
          <Text style={styles.weekSub}>expected · 4 days worked</Text>
          <View style={styles.weekDivider} />
          <TouchableOpacity style={styles.weekRow}>
            <Text style={styles.weekRowText}>Work on the 18th, 10 hours of rest</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Warning Card */}
        <TouchableOpacity style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#D97706" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>WARNING</Text>
            <Text style={styles.warningDesc}>Please check the precautions section.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D97706" />
        </TouchableOpacity>

        {/* Shortcut Grid */}
        <View style={styles.grid}>
          {SHORTCUTS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.shortcutCard}
              onPress={() => router.push(item.route as any)}>
              <View style={[styles.shortcutIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.shortcutTextWrap}>
                <Text style={styles.shortcutLabel}>{item.label}</Text>
                <Text style={styles.shortcutDesc}>{item.desc}</Text>
              </View>
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
  },
  dateText: {
    fontSize: 13,
    color: '#687076',
    marginTop: 2,
    marginLeft: 26,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  weekCard: {
    backgroundColor: Brand.primary,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
  },
  weekAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  weekSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  weekDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 8,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekRowText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  warningContent: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  warningDesc: {
    fontSize: 12,
    color: '#D97706',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTextWrap: {
    gap: 4,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  shortcutDesc: {
    fontSize: 12,
    color: '#687076',
    lineHeight: 17,
  },
});
