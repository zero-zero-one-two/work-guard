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
const CONNECTOR_HEIGHT = 2;

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
                  <Ionicons name="checkmark" size={14} color="#2F9448" />
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
    paddingHorizontal: 30,
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
    marginTop: CIRCLE_SIZE / 2 - CONNECTOR_HEIGHT / 2,
    marginHorizontal: 14,
    height: CONNECTOR_HEIGHT,
    borderRadius: 999,
    backgroundColor: '#AAB4C2',
  },
  lineCompleted: {
    backgroundColor: '#9CD6A3',
  },

  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#F2F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Brand.primary,
  },
  circleCompleted: {
    backgroundColor: '#F1FAF1',
    borderWidth: 1.5,
    borderColor: '#9CD6A3',
  },
  circleNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#AEB7C2',
  },
  circleNumActive: {
    color: '#fff',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B1B9C4',
  },
  labelActive: {
    color: Brand.primary,
    fontWeight: '700',
  },
  labelCompleted: {
    color: '#2F9448',
  },
});
