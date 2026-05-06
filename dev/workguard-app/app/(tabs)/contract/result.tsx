import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ContractLayout } from '@/components/contract/contract-layout';

type ResultStatus = 'violation' | 'warning' | 'normal';
type ResultVariant = 'issues' | 'clean';

interface SummaryChipData {
  label: string;
  count: number;
  status: ResultStatus;
}

interface DetailItem {
  title: string;
  law: string;
  description: string;
  status: ResultStatus;
  actionLabel?: string;
}

interface ResultData {
  summaryEyebrow: string;
  summaryTitle: string;
  summaryBody?: string;
  summaryEmoji?: string;
  variant: ResultVariant;
  chips: SummaryChipData[];
  items: DetailItem[];
}

const RESULT_DATA: Record<ResultVariant, ResultData> = {
  issues: {
    summaryEyebrow: '분석 완료',
    summaryTitle: '위반 사항\n3건 발견 됐어요',
    variant: 'issues',
    chips: [
      { label: '위반', count: 1, status: 'violation' },
      { label: '경고', count: 2, status: 'warning' },
      { label: '정상', count: 1, status: 'normal' },
    ],
    items: [
      {
        status: 'violation',
        law: '근로기준법 제56조',
        title: '연장근무 수당 미명시',
        description:
          '연장근무 시 통상임금의 1.5배 이상을 지급해야 하나, 계약서 내 관련 조항이 없어요.',
        actionLabel: '신고 방법 보기',
      },
      {
        status: 'warning',
        law: '근로기준법 제50조',
        title: '주 52시간 초과 근무 명시',
        description: '계약서에 주 52시간을 초과한 근무 일정이 기재되어 있어요.',
        actionLabel: '대응 방법 보기',
      },
      {
        status: 'warning',
        law: '근로기준법 제55조',
        title: '주휴일 불명확',
        description:
          '주 1회 이상 유급 휴일이 보장되어야 하나, 계약서 내 명시가 불분명해요.',
        actionLabel: '자세히 보기',
      },
      {
        status: 'normal',
        law: '최저임금법 제6조',
        title: '최저임금 기준 충족',
        description: '계약 시급 ₩ 10,030 - 2026년 최저임금 기준에 충족해요.',
      },
    ],
  },
  clean: {
    summaryEyebrow: '분석 완료',
    summaryTitle: '이상 없어요!',
    summaryBody: '계약서의 모든 항목이\n한국 노동법 기준에 적합해요.',
    summaryEmoji: '🎉',
    variant: 'clean',
    chips: [{ label: '정상', count: 5, status: 'normal' }],
    items: [
      {
        status: 'normal',
        law: '근로기준법 제56조',
        title: '연장 · 야간 · 휴일수당 명시',
        description: '모든 추가 수당 조항이 계약서에 명확히 기재되어 있어요.',
      },
      {
        status: 'normal',
        law: '최저임금법 제6조',
        title: '최저임금 기준 충족',
        description: '계약 시급 ₩ 10,030 - 2026년 최저임금 기준에 충족해요.',
      },
      {
        status: 'normal',
        law: '근로기준법 제50조',
        title: '소정근로시간 적법',
        description: '주 40시간 이내로 법정 기준에 맞아요.',
      },
      {
        status: 'normal',
        law: '근로기준법 제50조',
        title: '주휴일 명시',
        description: '매주 일요일 유급 휴일로 계약서에 명시되어 있어요.',
      },
      {
        status: 'normal',
        law: '근로기준법 제17조',
        title: '계약 필수 항목 모두 포함',
        description: '임금 · 근로시간 · 업무 내용 등 필수 항목이 모두 기재되어 있어요.',
      },
    ],
  },
};

function getStatusPalette(status: ResultStatus) {
  switch (status) {
    case 'violation':
      return {
        line: '#EA2F14',
        badgeBg: '#FFF0EA',
        badgeText: '#EA2F14',
        action: '#EA2F14',
      };
    case 'warning':
      return {
        line: '#E57B11',
        badgeBg: '#FFF4E3',
        badgeText: '#C56A0B',
        action: '#E57B11',
      };
    case 'normal':
      return {
        line: '#1F8E39',
        badgeBg: '#E8F8EA',
        badgeText: '#1F8E39',
        action: '#1F8E39',
      };
  }
}

function getStatusLabel(status: ResultStatus) {
  switch (status) {
    case 'violation':
      return '위반';
    case 'warning':
      return '경고';
    case 'normal':
      return '정상';
  }
}

function SummaryChip({ chip }: { chip: SummaryChipData }) {
  const palette = getStatusPalette(chip.status);

  return (
    <View style={[styles.summaryChip, { backgroundColor: palette.badgeBg }]}>
      <Text style={[styles.summaryChipText, { color: palette.badgeText }]}>
        {chip.label} {chip.count}건
      </Text>
    </View>
  );
}

function ResultSummaryCard({ data }: { data: ResultData }) {
  const isClean = data.variant === 'clean';

  return (
    <View style={[styles.summaryCard, isClean ? styles.summaryCardClean : styles.summaryCardIssues]}>
      <Text style={styles.summaryEyebrow}>{data.summaryEyebrow}</Text>
      <View style={styles.summaryTitleRow}>
        <Text style={[styles.summaryTitle, styles.summaryTitleIssues]}>{data.summaryTitle}</Text>
        {data.summaryEmoji ? <Text style={styles.summaryEmoji}>{data.summaryEmoji}</Text> : null}
      </View>
      {data.summaryBody ? <Text style={styles.summaryBody}>{data.summaryBody}</Text> : null}
      <View style={styles.summaryChipRow}>
        {data.chips.map((chip) => (
          <SummaryChip key={`${chip.status}-${chip.label}`} chip={chip} />
        ))}
      </View>
    </View>
  );
}

function ResultDetailCard({ item }: { item: DetailItem }) {
  const palette = getStatusPalette(item.status);

  return (
    <View style={[styles.detailCard, { backgroundColor: palette.line }]}>
      <View style={styles.detailCardSurface}>
        <View style={styles.detailCardBody}>
        <View style={styles.detailHeaderRow}>
          <View style={[styles.detailStatusBadge, { backgroundColor: palette.badgeBg }]}>
            <Text style={[styles.detailStatusText, { color: palette.badgeText }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.detailLaw}>{item.law}</Text>
        </View>

        <Text style={styles.detailTitle}>{item.title}</Text>
        <Text style={styles.detailDescription}>{item.description}</Text>

        {item.actionLabel ? (
          <TouchableOpacity activeOpacity={0.8} style={styles.detailAction}>
            <Text style={[styles.detailActionText, { color: palette.action }]}>{item.actionLabel} →</Text>
          </TouchableOpacity>
        ) : null}
        </View>
      </View>
    </View>
  );
}

function FooterCTA() {
  return (
    <>
      <TouchableOpacity style={styles.chatbotCTA} activeOpacity={0.88}>
        <Ionicons name="chatbubbles-outline" size={28} color="#fff" />
        <Text style={styles.chatbotCTAText}>챗봇에서 대응 방법 확인하기 →</Text>
      </TouchableOpacity>

      <View style={styles.disclaimerRow}>
        <Ionicons name="warning-outline" size={28} color="#8E97A3" />
        <Text style={styles.disclaimerText}>본 결과는 법률 자문이 아닌 참고용입니다</Text>
      </View>
    </>
  );
}

export default function ContractResultScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ variant?: string }>();
  const variant: ResultVariant = params.variant === 'clean' ? 'clean' : 'issues';
  const data = RESULT_DATA[variant];
  const handleClose = () => {
    const parent = navigation.getParent();

    if (parent) {
      parent.dispatch(TabActions.jumpTo('index'));
      return;
    }

    router.replace('/');
  };

  return (
    <ContractLayout
      step={3}
      title="결과 확인"
      rightAction="home"
      onBack={() => router.replace('/contract')}
      onRightAction={handleClose}
      rightContent={
        variant === 'issues' ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.replace('/contract/result?variant=clean')}>
            <Text style={styles.previewActionText}>정상</Text>
          </TouchableOpacity>
        ) : null
      }>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator>
        <ResultSummaryCard data={data} />

        <View style={styles.detailList}>
          {data.items.map((item) => (
            <ResultDetailCard key={`${item.status}-${item.title}`} item={item} />
          ))}
        </View>

        <FooterCTA />
      </ScrollView>
    </ContractLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 188,
  },
  summaryCardIssues: {
    backgroundColor: '#1B2028',
  },
  summaryCardClean: {
    backgroundColor: '#1F8E39',
  },
  summaryEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    marginBottom: 8,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  summaryTitle: {
    flexShrink: 1,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.8,
  },
  summaryTitleIssues: {
    fontSize: 33,
    lineHeight: 41,
    letterSpacing: -1,
  },
  summaryEmoji: {
    fontSize: 26,
    lineHeight: 33,
  },
  summaryBody: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  summaryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  summaryChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailList: {
    gap: 12,
  },
  detailCard: {
    overflow: 'hidden',
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 22,
    elevation: 2,
  },
  detailCardSurface: {
    marginLeft: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  detailCardBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  detailStatusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailLaw: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#9AA3AE',
  },
  detailTitle: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: -0.3,
  },
  detailDescription: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#98A2AE',
  },
  detailAction: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  detailActionText: {
    fontSize: 15,
    fontWeight: '800',
  },
  chatbotCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    borderRadius: 22,
    backgroundColor: '#3D7EF0',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  chatbotCTAText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E97A3',
  },
  previewActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F8E39',
  },
});
