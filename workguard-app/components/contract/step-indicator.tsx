import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export type StepStatus = 'completed' | 'active' | 'pending';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

function getStatus(stepNum: number, currentStep: number): StepStatus {
  if (stepNum < currentStep) return 'completed';
  if (stepNum === currentStep) return 'active';
  return 'pending';
}

const STEPS = [
  { num: 1, label: '계약서 등록' },
  { num: 2, label: '분석 중' },
  { num: 3, label: '결과 확인' },
];

const CIRCLE_SIZE = 32;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {STEPS.map((step, idx) => {
        const status = getStatus(step.num, currentStep);
        const prevStatus = idx > 0 ? getStatus(idx, currentStep) : null;

        return (
          <View
            key={step.num}
            style={[styles.stepSlot, idx > 0 && styles.stepSlotFlex]}>
            {/* 이전 스텝과의 연결선 */}
            {idx > 0 && (
              <View
                style={[
                  styles.line,
                  prevStatus === 'completed' && styles.lineCompleted,
                ]}
              />
            )}

            {/* 원 + 라벨 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  status === 'active' && styles.circleActive,
                  status === 'completed' && styles.circleCompleted,
                ]}>
                {status === 'completed' ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.circleNum,
                      status === 'active' && styles.circleNumActive,
                    ]}>
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  status === 'active' && styles.labelActive,
                  status === 'completed' && styles.labelCompleted,
                ]}>
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F6F7F9',
  },

  // 1단계: 고정 너비(원만), 2·3단계: flex로 남은 공간 차지
  stepSlot: {
    alignItems: 'center',
  },
  stepSlotFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // 연결선 — marginTop으로 원의 수직 중앙에 맞춤
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E5E7EB',
    marginTop: CIRCLE_SIZE / 2 - 0.75,
  },
  lineCompleted: {
    backgroundColor: '#16A34A',
  },

  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Brand.primary,
  },
  circleCompleted: {
    backgroundColor: '#16A34A',
  },
  circleNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9BA1A6',
  },
  circleNumActive: {
    color: '#fff',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9BA1A6',
  },
  labelActive: {
    color: Brand.primary,
    fontWeight: '600',
  },
  labelCompleted: {
    color: '#16A34A',
  },
});
