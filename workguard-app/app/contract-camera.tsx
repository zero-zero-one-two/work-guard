import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAPTURED_PAGES = [1, 2];
const CORNER = 44;
const CORNER_W = 4;
const CORNER_COLOR = '#3182F6';
const DOC_INSET = 20;

export default function ContractCameraScreen() {
  const insets = useSafeAreaInsets();
  const [totalPages, setTotalPages] = useState(5);
  const [currentPage, setCurrentPage] = useState(3);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>

      {/* 닫기 */}
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>

      {/* 뷰파인더 — flex:1 로 남은 세로 공간 전부 */}
      <View style={styles.viewfinder}>
        <View style={styles.docPreview}>
          <View style={styles.docLines}>
            {[88, 72, 80, 65, 85, 70, 78, 60, 74].map((w, i) => (
              <View key={i} style={[styles.docLine, { width: `${w}%` as any }]} />
            ))}
          </View>
          <View style={styles.guidePill}>
            <Text style={styles.guidePillText}>계약서를 프레임 안에 맞춰주세요</Text>
          </View>
        </View>

        {/* 코너 브라켓 — docPreview 위에 렌더링 */}
        <View style={[styles.corner, styles.cTL]} />
        <View style={[styles.corner, styles.cTR]} />
        <View style={[styles.corner, styles.cBL]} />
        <View style={[styles.corner, styles.cBR]} />
      </View>

      {/* 하단 컨트롤 — 단일 View로 묶어서 flex 영향 차단 */}
      <View style={styles.bottomControls}>

        {/* 페이지 썸네일 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
            const captured = CAPTURED_PAGES.includes(page);
            const selected = page === currentPage;
            return (
              <TouchableOpacity
                key={page}
                style={[styles.thumb, selected && styles.thumbSelected]}
                onPress={() => setCurrentPage(page)}>
                {captured && (
                  <View style={styles.thumbCheck}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  </View>
                )}
                <View style={styles.thumbDoc}>
                  {[70, 90, 55, 75].map((w, i) => (
                    <View key={i} style={[styles.thumbLine, { width: `${w}%` as any }]} />
                  ))}
                </View>
                <Text style={[styles.thumbLabel, selected && styles.thumbLabelSelected]}>
                  {page}p
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.thumbAdd}
            onPress={() => {
              const next = totalPages + 1;
              setTotalPages(next);
              setCurrentPage(next);
            }}>
            <Ionicons name="add" size={20} color="#9BA1A6" />
          </TouchableOpacity>
        </ScrollView>

        {/* 이전 / 페이지 수 / 다음 */}
        <View style={styles.pageNav}>
          <TouchableOpacity style={styles.pageNavBtn} onPress={() => setCurrentPage(p => Math.max(1, p - 1))}>
            <Ionicons name="chevron-back" size={14} color="#fff" />
            <Text style={styles.pageNavText}>이전</Text>
          </TouchableOpacity>
          <Text>
            <Text style={styles.pageCountNum}>{currentPage}</Text>
            <Text style={styles.pageCountTotal}> / {totalPages} 페이지</Text>
          </Text>
          <TouchableOpacity style={styles.pageNavBtn} onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
            <Text style={styles.pageNavText}>다음</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 갤러리 / 촬영 / 파일 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="image-outline" size={26} color="#fff" />
            <Text style={styles.actionLabel}>갤러리</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="document-outline" size={26} color="#fff" />
            <Text style={styles.actionLabel}>파일</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/contract/analyzing')}>
          <Text style={styles.ctaBtnText}>촬영 완료 · 분석 시작하기 →</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },

  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },

  viewfinder: {
    flex: 1,
    position: 'relative',
    marginBottom: 12,
  },

  corner: { position: 'absolute', width: CORNER, height: CORNER, zIndex: 2 },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: CORNER_COLOR, borderTopLeftRadius: 20 },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: CORNER_COLOR, borderTopRightRadius: 20 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: CORNER_COLOR, borderBottomLeftRadius: 20 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: CORNER_COLOR, borderBottomRightRadius: 20 },

  docPreview: {
    position: 'absolute',
    top: DOC_INSET,
    left: DOC_INSET,
    right: DOC_INSET,
    bottom: DOC_INSET,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 20,
    justifyContent: 'space-between',
  },
  docLines: { gap: 9 },
  docLine: { height: 8, backgroundColor: '#48484A', borderRadius: 4 },
  guidePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guidePillText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // 하단 전체 묶음 — flex 없음
  bottomControls: {
    gap: 12,
  },

  thumbRow: { gap: 8, alignItems: 'center' },
  thumb: {
    width: 52,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#48484A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
  },
  thumbSelected: { borderColor: CORNER_COLOR },
  thumbCheck: { position: 'absolute', top: 3, right: 3 },
  thumbDoc: { width: '100%', gap: 3 },
  thumbLine: { height: 3, backgroundColor: '#636366', borderRadius: 2 },
  thumbLabel: { fontSize: 10, color: '#9BA1A6', fontWeight: '600' },
  thumbLabelSelected: { color: CORNER_COLOR },
  thumbAdd: {
    width: 52,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#48484A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  pageNavText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  pageCountNum: { color: CORNER_COLOR, fontWeight: '700', fontSize: 15 },
  pageCountTotal: { color: '#fff', fontWeight: '500', fontSize: 15 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionBtn: {
    width: 64,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: { color: '#9BA1A6', fontSize: 11 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#636366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
  },

  ctaBtn: {
    backgroundColor: CORNER_COLOR,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
