import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { contractStore } from '@/store/contractStore';

import { API_BASE_URL } from '@/constants/api';
import { ContractLayout } from '@/components/contract/contract-layout';

type StepStatus = 'completed' | 'active' | 'pending';

const BASE_STEPS = [
  { label: '텍스트 추출 (OCR)', sub: '이미지에서 텍스트를 읽었어요' },
  { label: '조항 분류', sub: '계약 항목을 구분했어요' },
  { label: '노동법 기준 대조', sub: '법령 데이터베이스와 비교하고 있어요' },
  { label: '최종 리포트 생성', sub: '' },
] as const;

function SpinnerIcon() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();
    glowLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [glowAnim, pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const haloScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const haloOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.08],
  });

  return (
    <View style={styles.spinnerWrap}>
      <Animated.View
        style={[
          styles.spinnerHalo,
          {
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View style={styles.spinnerTrack} />
      <Animated.View
        style={[
          styles.spinnerArcWrap,
          {
            transform: [{ rotate }],
          },
        ]}>
        <View style={styles.spinnerArc} />
      </Animated.View>
      <Animated.View
        style={[
          styles.spinnerCenter,
          {
            transform: [{ scale }],
          },
        ]}>
        <Ionicons name="document-text-outline" size={28} color="#11181C" />
      </Animated.View>
    </View>
  );
}

function ActiveRing() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  return (
    <Animated.View
      style={[
        styles.stepIconPulse,
        {
          opacity,
          transform: [{ rotate }, { scale }],
        },
      ]}>
      <View style={styles.stepIconRing} />
    </Animated.View>
  );
}

function PendingStepNumber({ index }: { index: number }) {
  return <Text style={styles.stepNum}>{index + 1}</Text>;
}

function StepRow({ step, index }: { step: { label: string; sub: string; status: StepStatus }; index: number }) {
  const isCompleted = step.status === 'completed';
  const isActive = step.status === 'active';
  const isPending = step.status === 'pending';

  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepIcon,
          isCompleted && styles.stepIconCompleted,
          isActive && styles.stepIconActive,
          isPending && styles.stepIconPending,
        ]}>
        {isCompleted && <Ionicons name="checkmark" size={18} color="#2D9C57" />}
        {isActive && <ActiveRing />}
        {isPending && <PendingStepNumber index={index} />}
      </View>

      <View style={styles.stepText}>
        <Text
          style={[
            styles.stepLabel,
            isCompleted && styles.stepLabelCompleted,
            isActive && styles.stepLabelActive,
          ]}>
          {step.label}
        </Text>
        {step.sub ? (
          <Text
            style={[
              styles.stepSub,
              isCompleted && styles.stepSubCompleted,
              isActive && styles.stepSubActive,
            ]}>
            {step.sub}
          </Text>
        ) : null}
      </View>

      {isCompleted && (
        <View style={[styles.badge, styles.badgeCompleted]}>
          <Text style={[styles.badgeText, styles.badgeTextCompleted]}>완료</Text>
        </View>
      )}
      {isActive && (
        <View style={[styles.badge, styles.badgeActive]}>
          <Text style={[styles.badgeText, styles.badgeTextActive]}>진행중</Text>
        </View>
      )}
    </View>
  );
}

async function analyzeImages(images: string[]): Promise<void> {
  for (const uri of images) {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'contract.jpg';
    formData.append('file', { uri, name: filename, type: 'image/jpeg' } as any);

    const response = await fetch(`${API_BASE_URL}/contracts/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`서버 오류 (${response.status}): ${err}`);
    }

    const result = await response.json();
    console.log('[analyzing] API 응답 수신, is_clean:', result?.is_clean, '| items:', result?.items?.length);
    contractStore.setResult(result);
    console.log('[analyzing] contractStore.setResult 완료, getResult():', contractStore.getResult()?.is_clean);
    return; // 첫 번째 이미지 결과만 사용 (추후 다중 페이지 지원 확장)
  }
}

export default function ContractAnalyzingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const pageCount = contractStore.getImages().length;

  // API 호출 - 완료되면 apiDone=true, 절대 타이머로 네비게이션 안 함
  useEffect(() => {
    const images = contractStore.getImages();
    console.log('[analyzing] 이미지 개수:', images.length, '| API_URL:', API_BASE_URL);

    if (images.length === 0) {
      console.warn('[analyzing] 이미지가 없어요! contractStore.getImages() = []');
    }

    analyzeImages(images)
      .then(() => {
        console.log('[analyzing] analyzeImages 완료 → setApiDone(true)');
        setApiDone(true);
      })
      .catch((err) => {
        console.error('[analyzing] 오류:', err.message);
        Alert.alert('분석 실패', err.message ?? '서버에 연결할 수 없어요.', [
          { text: '돌아가기', onPress: () => router.back() },
        ]);
      });
  }, []);

  // 애니메이션: 3번째 스텝까지만 자동 진행 (마지막은 API 완료 시)
  useEffect(() => {
    if (activeIndex >= BASE_STEPS.length - 1) return;
    const t = setTimeout(() => setActiveIndex((p) => p + 1), 2000);
    return () => clearTimeout(t);
  }, [activeIndex]);

  // API 완료되면 마지막 스텝 표시 후 result로 이동
  useEffect(() => {
    if (!apiDone) return;
    setActiveIndex(BASE_STEPS.length);
    const t = setTimeout(() => router.replace('/contract/result'), 800);
    return () => clearTimeout(t);
  }, [apiDone]);

  const steps = useMemo(
    () =>
      BASE_STEPS.map((step, index) => {
        let status: StepStatus = 'pending';

        if (index < activeIndex) {
          status = 'completed';
        } else if (index === activeIndex && activeIndex < BASE_STEPS.length) {
          status = 'active';
        } else if (activeIndex >= BASE_STEPS.length) {
          status = 'completed';
        }

        return { ...step, status };
      }),
    [activeIndex]
  );

  const isAnalysisComplete = activeIndex >= BASE_STEPS.length;

  return (
    <ContractLayout
      step={2}
      rightAction={null}
      onBack={() => router.replace('/contract')}>
      <View style={styles.container}>
        <View style={styles.statusSection}>
          <SpinnerIcon />
          <Text style={styles.statusTitle}>
            {isAnalysisComplete ? '분석 완료했어요!' : '계약서 분석 중이에요'}
          </Text>
          <Text style={styles.statusSub}>
            {isAnalysisComplete ? '결과 화면으로 이동하고 있어요...' : '잠깐만 기다려 주세요...'}
          </Text>
        </View>

        <View style={styles.fileCard}>
          <View style={styles.fileIconWrap}>
            <Ionicons name="document-text-outline" size={26} color="#11181C" />
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              근로계약서.jpg
            </Text>
            <View style={styles.fileMetaRow}>
              <Text style={styles.fileMeta}>{pageCount}페이지</Text>
            </View>
          </View>
          <View style={styles.fileUploadBadge}>
            <Ionicons name="checkmark" size={12} color="#3182F6" />
            <Text style={styles.fileUpload}>업로드 완료</Text>
          </View>
        </View>

        <View style={styles.stepsCard}>
          {steps.map((step, i) => (
            <View key={step.label}>
              <StepRow step={step} index={i} />
              {i < steps.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>
    </ContractLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  statusSection: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  statusTextBlock: {
    alignItems: 'center',
    gap: 6,
  },
  statusEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182F6',
    letterSpacing: 0.2,
  },
  spinnerWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  spinnerHalo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DCEBFF',
  },
  spinnerTrack: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#DCEBFF',
  },
  spinnerArcWrap: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerArc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'transparent',
    borderTopColor: '#3182F6',
    borderRightColor: '#77AEFF',
  },
  spinnerCenter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F2F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3182F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: -0.5,
  },
  statusSub: {
    fontSize: 14,
    color: '#687076',
  },
  progressPill: {
    width: '100%',
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E6EFFD',
  },
  progressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E8EEF7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3182F6',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C7FD9',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  fileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EBF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 3,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileUploadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EBF3FF',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  fileMeta: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  fileUpload: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182F6',
  },
  stepsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconCompleted: {
    backgroundColor: '#DCFCE7',
  },
  stepIconActive: {
    backgroundColor: '#EBF3FF',
  },
  stepIconPending: {
    backgroundColor: '#F1F3F5',
  },
  stepIconPulse: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: '#9CC2FF',
    borderTopColor: '#3182F6',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9BA1A6',
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9BA1A6',
  },
  stepLabelCompleted: {
    color: '#11181C',
  },
  stepLabelActive: {
    color: '#11181C',
  },
  stepSub: {
    fontSize: 13,
    color: '#9BA1A6',
  },
  stepSubCompleted: {
    color: '#16A34A',
  },
  stepSubActive: {
    color: '#3182F6',
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeCompleted: {
    backgroundColor: '#F0FDF4',
  },
  badgeActive: {
    backgroundColor: '#EBF3FF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextCompleted: {
    color: '#16A34A',
  },
  badgeTextActive: {
    color: '#3182F6',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  tempBtn: {
    marginTop: 2,
    backgroundColor: '#3182F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tempBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
