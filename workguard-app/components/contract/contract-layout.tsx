import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { StepIndicator } from './step-indicator';

interface ContractLayoutProps {
  step: 1 | 2 | 3;
  title?: string;
  children: ReactNode;
  onBack?: () => void;
  rightAction?: 'close' | 'save' | null;
  onRightAction?: () => void;
}

const DEFAULT_TITLES: Record<1 | 2 | 3, string> = {
  1: '계약서 분석',
  2: '분석 중',
  3: '분석 중',
};

export function ContractLayout({
  step,
  title,
  children,
  onBack,
  rightAction = 'close',
  onRightAction,
}: ContractLayoutProps) {
  const insets = useSafeAreaInsets();
  const headerTitle = title ?? DEFAULT_TITLES[step];
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 + 스테퍼 — 명시적 흰 배경 래퍼 */}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <View style={styles.backCircle}>
              <Ionicons name="chevron-back" size={20} color="#11181C" />
            </View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </TouchableOpacity>
          {rightAction && (
            <TouchableOpacity onPress={onRightAction}>
              <Text style={styles.rightActionText}>
                {rightAction === 'close' ? '닫기' : '저장'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <StepIndicator currentStep={step} />
        <View style={styles.divider} />
      </View>

      {/* Screen Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    backgroundColor: Brand.background,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#11181C',
  },
  rightActionText: {
    fontSize: 16,
    color: '#687076',
    paddingHorizontal: 4,
  },
  content: {
    flex: 1,
    backgroundColor: Brand.background,
  },
});
