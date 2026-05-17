import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function goToChat(message: string) {
  router.push({ pathname: '/chatbot/chat' as any, params: { initialMessage: message } });
}

import { ContractLayout } from '@/components/contract/contract-layout';
import { contractStore, type AnalysisItem } from '@/store/contractStore';

type ResultStatus = 'violation' | 'warning' | 'normal' | 'unknown';

function getStatusPalette(status: ResultStatus) {
  switch (status) {
    case 'violation':
      return { line: '#EA2F14', badgeBg: '#FFF0EA', badgeText: '#EA2F14', action: '#EA2F14' };
    case 'warning':
      return { line: '#E57B11', badgeBg: '#FFF4E3', badgeText: '#C56A0B', action: '#E57B11' };
    case 'normal':
      return { line: '#1F8E39', badgeBg: '#E8F8EA', badgeText: '#1F8E39', action: '#1F8E39' };
    case 'unknown':
      return { line: '#9BA1A6', badgeBg: '#F1F3F5', badgeText: '#687076', action: '#687076' };
  }
}

function getStatusLabel(status: ResultStatus) {
  switch (status) {
    case 'violation': return '위반';
    case 'warning':   return '경고';
    case 'normal':    return '정상';
    case 'unknown':   return '확인불가';
  }
}

function ResultDetailCard({ item }: { item: AnalysisItem }) {
  const status = item.status as ResultStatus;
  const palette = getStatusPalette(status);

  return (
    <View style={[styles.detailCard, { backgroundColor: palette.line }]}>
      <View style={styles.detailCardSurface}>
        <View style={styles.detailCardBody}>
          <View style={styles.detailHeaderRow}>
            <View style={[styles.detailStatusBadge, { backgroundColor: palette.badgeBg }]}>
              <Text style={[styles.detailStatusText, { color: palette.badgeText }]}>
                {getStatusLabel(status)}
              </Text>
            </View>
            {item.law ? <Text style={styles.detailLaw}>{item.law}</Text> : null}
          </View>

          <Text style={styles.detailTitle}>{item.title}</Text>
          <Text style={styles.detailDescription}>{item.description}</Text>

          {item.evidence ? (
            <Text style={styles.detailEvidence}>📄 {item.evidence}</Text>
          ) : null}

          {item.actionLabel ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.detailAction}
              onPress={() => goToChat(
                `[${getStatusLabel(status)}] ${item.title}\n\n${item.description}${item.law ? '\n\n관련 법령: ' + item.law : ''}`
              )}>
              <Text style={[styles.detailActionText, { color: palette.action }]}>
                {item.actionLabel} →
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ContractResultScreen() {
  const navigation = useNavigation();
  const result = contractStore.getResult();
  console.log('[result] contractStore.getResult():', result?.is_clean, '| items:', result?.items?.length);

  const handleClose = () => {
    contractStore.clear();
    const parent = navigation.getParent();
    if (parent) {
      parent.dispatch(TabActions.jumpTo('index'));
      return;
    }
    router.replace('/');
  };

  if (!result) {
    return (
      <ContractLayout step={3} title="결과 확인" rightAction="home"
        onBack={() => router.replace('/contract')} onRightAction={handleClose}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>분석 결과가 없어요.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace('/contract')}>
            <Text style={styles.retryBtnText}>다시 시도하기</Text>
          </TouchableOpacity>
        </View>
      </ContractLayout>
    );
  }

  const { is_clean, summary, items } = result;
  const issueCount = summary.violation + summary.warning;

  const summaryTitle = is_clean
    ? '이상 없어요!'
    : `위반 ${summary.violation}건\n경고 ${summary.warning}건 발견됐어요`;

  return (
    <ContractLayout
      step={3}
      title="결과 확인"
      rightAction="home"
      onBack={() => router.replace('/contract')}
      onRightAction={handleClose}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator>

        {/* 요약 카드 */}
        <View style={[styles.summaryCard, is_clean ? styles.summaryCardClean : styles.summaryCardIssues]}>
          <Text style={styles.summaryEyebrow}>분석 완료</Text>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
            {is_clean ? <Text style={styles.summaryEmoji}>🎉</Text> : null}
          </View>
          {is_clean ? (
            <Text style={styles.summaryBody}>{'계약서의 모든 항목이\n한국 노동법 기준에 적합해요.'}</Text>
          ) : null}
          <View style={styles.summaryChipRow}>
            {summary.violation > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: '#FFF0EA' }]}>
                <Text style={[styles.summaryChipText, { color: '#EA2F14' }]}>위반 {summary.violation}건</Text>
              </View>
            )}
            {summary.warning > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: '#FFF4E3' }]}>
                <Text style={[styles.summaryChipText, { color: '#C56A0B' }]}>경고 {summary.warning}건</Text>
              </View>
            )}
            {summary.normal > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: '#E8F8EA' }]}>
                <Text style={[styles.summaryChipText, { color: '#1F8E39' }]}>정상 {summary.normal}건</Text>
              </View>
            )}
            {summary.unknown > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: '#F1F3F5' }]}>
                <Text style={[styles.summaryChipText, { color: '#687076' }]}>확인불가 {summary.unknown}건</Text>
              </View>
            )}
          </View>
        </View>

        {/* 항목 카드 */}
        <View style={styles.detailList}>
          {items.map((item) => (
            <ResultDetailCard key={item.id} item={item} />
          ))}
        </View>

        {/* 하단 CTA */}
        <TouchableOpacity
          style={styles.chatbotCTA}
          activeOpacity={0.88}
          onPress={() => {
            const itemSummary = result.items
              .map(item => `[${getStatusLabel(item.status as ResultStatus)}] ${item.title}\n${item.description}${item.law ? ` (${item.law})` : ''}`)
              .join('\n\n');
            goToChat(`계약서 분석 결과입니다.\n\n${itemSummary}\n\n위 내용을 바탕으로 대응 방법을 알려주세요.`);
          }}>
          <Ionicons name="chatbubbles-outline" size={28} color="#fff" />
          <Text style={styles.chatbotCTAText}>챗봇에서 대응 방법 확인하기 →</Text>
        </TouchableOpacity>

        <View style={styles.disclaimerRow}>
          <Ionicons name="warning-outline" size={16} color="#8E97A3" />
          <Text style={styles.disclaimerText}>본 결과는 법률 자문이 아닌 참고용입니다</Text>
        </View>
      </ScrollView>
    </ContractLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
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
    minHeight: 160,
  },
  summaryCardIssues: { backgroundColor: '#1B2028' },
  summaryCardClean: { backgroundColor: '#1F8E39' },
  summaryEyebrow: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.72)', marginTop: 4, marginBottom: 8,
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  summaryTitle: {
    flexShrink: 1, fontSize: 28, lineHeight: 36,
    fontWeight: '800', color: '#fff', letterSpacing: -0.8,
  },
  summaryEmoji: { fontSize: 26, lineHeight: 33 },
  summaryBody: {
    marginTop: 6, fontSize: 15, lineHeight: 22,
    fontWeight: '700', color: 'rgba(255,255,255,0.9)',
  },
  summaryChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  summaryChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  summaryChipText: { fontSize: 13, fontWeight: '800' },

  detailList: { gap: 12 },
  detailCard: {
    overflow: 'hidden', borderRadius: 24,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 22, elevation: 2,
  },
  detailCardSurface: { marginLeft: 4, borderRadius: 20, backgroundColor: '#fff' },
  detailCardBody: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18 },
  detailHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  detailStatusBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  detailStatusText: { fontSize: 13, fontWeight: '800' },
  detailLaw: {
    flexShrink: 1, textAlign: 'right',
    fontSize: 13, fontWeight: '700', color: '#9AA3AE',
  },
  detailTitle: {
    marginTop: 14, fontSize: 17, lineHeight: 24,
    fontWeight: '800', color: '#11181C', letterSpacing: -0.3,
  },
  detailDescription: {
    marginTop: 10, fontSize: 13, lineHeight: 20,
    fontWeight: '500', color: '#687076',
  },
  detailEvidence: {
    marginTop: 8, fontSize: 12, lineHeight: 18,
    color: '#9BA1A6', fontStyle: 'italic',
  },
  detailAction: { alignSelf: 'flex-start', marginTop: 14 },
  detailActionText: { fontSize: 15, fontWeight: '800' },

  chatbotCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 4, borderRadius: 22, backgroundColor: '#3D7EF0',
    paddingVertical: 18, paddingHorizontal: 18,
  },
  chatbotCTAText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  disclaimerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginTop: 8,
  },
  disclaimerText: { fontSize: 13, fontWeight: '700', color: '#8E97A3' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: '#687076', fontWeight: '600' },
  retryBtn: {
    backgroundColor: '#3182F6', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
