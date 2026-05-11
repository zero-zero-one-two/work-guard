import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { API_BASE_URL } from '@/constants/api';


// ── Overtime slider constants ──────────────────────────────────────
const MAX_OT = 8;
const OT_STEP = 0.5;
const TRACK_TOP = 13;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const THUMB_TOP = TRACK_TOP - (THUMB_SIZE - TRACK_HEIGHT) / 2;

// ── Time picker constants ──────────────────────────────────────────
const ITEM_H = 50;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// ── Data ───────────────────────────────────────────────────────────
const DAY_NAMES: Record<string, string> = {
  '1': 'Thursday', '2': 'Friday',
  '3': 'Sunday', '4': 'Monday', '5': 'Tuesday', '6': 'Wednesday',
  '7': 'Thursday', '8': 'Friday', '9': 'Saturday',
  '10': 'Sunday', '11': 'Monday', '12': 'Tuesday', '13': 'Wednesday',
  '14': 'Thursday', '15': 'Friday', '16': 'Saturday',
  '17': 'Sunday', '18': 'Monday', '19': 'Tuesday', '20': 'Wednesday',
  '21': 'Thursday', '22': 'Friday', '23': 'Saturday',
  '24': 'Sunday', '25': 'Monday', '26': 'Tuesday', '27': 'Wednesday',
  '28': 'Thursday', '29': 'Friday', '30': 'Saturday',
};

// ── Helpers ─────────────────────────────────────────────────────────
function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, mIdx: Math.round(m / 5) };
}

function formatTime(h: number, mIdx: number) {
  return `${String(h).padStart(2, '0')}:${String(mIdx * 5).padStart(2, '0')}`;
}

// ── Wheel column ─────────────────────────────────────────────────────
// forwardRef로 노출: getIndex() → 현재 스크롤 위치의 인덱스
type WheelRef = { getIndex: () => number };

const WheelColumn = forwardRef<WheelRef, { items: string[]; initialIndex: number }>(
  ({ items, initialIndex }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const offsetRef = useRef(initialIndex * ITEM_H);
    const [localIdx, setLocalIdx] = useState(initialIndex);
    const initialized = useRef(false);

    // 확인 버튼 탭 시 부모가 현재 인덱스를 읽을 수 있도록 노출
    useImperativeHandle(ref, () => ({
      getIndex: () =>
        Math.max(0, Math.min(items.length - 1, Math.round(offsetRef.current / ITEM_H))),
    }));

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      offsetRef.current = y;
      // 실시간으로 중앙 아이템 강조
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
      setLocalIdx(idx);
    };

    return (
      <View style={pickerStyles.column}>
        {/* 선택 영역 하이라이트 밴드 */}
        <View style={pickerStyles.selectionBand} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          onLayout={() => {
            // 마운트 직후 한 번만 초기 위치로 이동
            if (!initialized.current) {
              scrollRef.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
              initialized.current = true;
            }
          }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {items.map((item, i) => (
            <View key={i} style={pickerStyles.item}>
              <Text
                style={[
                  pickerStyles.itemText,
                  i === localIdx && pickerStyles.itemTextSelected,
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  },
);
WheelColumn.displayName = 'WheelColumn';

// ── Overtime slider ─────────────────────────────────────────────────
function OvertimeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackWidthRef = useRef(0);
  const startOtRef = useRef(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = trackWidthRef.current;
        if (w > 0) {
          const clamped = Math.max(
            0,
            Math.min(MAX_OT, Math.round(((evt.nativeEvent.locationX / w) * MAX_OT) / OT_STEP) * OT_STEP),
          );
          onChange(clamped);
          startOtRef.current = clamped;
        } else {
          startOtRef.current = valueRef.current;
        }
      },
      onPanResponderMove: (_, gs) => {
        const w = trackWidthRef.current;
        if (!w) return;
        const raw = startOtRef.current + (gs.dx / w) * MAX_OT;
        onChange(Math.max(0, Math.min(MAX_OT, Math.round(raw / OT_STEP) * OT_STEP)));
      },
    }),
  ).current;

  const pct = value / MAX_OT;

  return (
    <View
      style={styles.sliderWrapper}
      onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrackBg} />
      <View style={[styles.sliderTrackFill, { width: `${pct * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${pct * 100}%`, marginLeft: -THUMB_SIZE / 2 }]} />
      <View style={styles.sliderLabels}>
        {['0h', '2h', '4h', '6h', '8h'].map((l) => (
          <Text key={l} style={styles.sliderLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();

  const dateStr = Array.isArray(date) ? date[0] : (date ?? '1');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const dayName = DAY_NAMES[dateStr] ?? 'Thursday';

  // 시간 상태
  const [startH, setStartH] = useState(9);
  const [startMIdx, setStartMIdx] = useState(0);
  const [endH, setEndH] = useState(18);
  const [endMIdx, setEndMIdx] = useState(0);

  // 피커 상태
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [tempH, setTempH] = useState(0);
  const [tempMIdx, setTempMIdx] = useState(0);

  // WheelColumn refs — 확인 시 현재 인덱스 읽기
  const hourWheelRef = useRef<WheelRef>(null);
  const minWheelRef = useRef<WheelRef>(null);

  // 기타 상태
  const [overtime, setOvertime] = useState(2.5);
  const [nightShift, setNightShift] = useState(false);
  const [holidayWork, setHolidayWork] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  const [fee, setFee] = useState<number | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/work-logs/${year}/${month}/${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          setLogId(data.id);
          if (data.start_time) {
            const s = parseTime(data.start_time);
            setStartH(s.h);
            setStartMIdx(s.mIdx);
          }
          if (data.end_time) {
            const e = parseTime(data.end_time);
            setEndH(e.h);
            setEndMIdx(e.mIdx);
          }
          setOvertime(data.overtime_hours);
          setNightShift(data.is_night_shift);
          setHolidayWork(data.is_holiday_work);
          setFee(data.fee);
        }
      } catch (e) {}
    };
    fetchLog();
  }, [dateStr, year, month]);

  // DURATION: start/end 기반 자동 계산 (휴게시간 제외: 8h+ → 60min, 4h+ → 30min)
  const rawMin = Math.max(0, (endH * 60 + endMIdx * 5) - (startH * 60 + startMIdx * 5));
  const breakMin = rawMin >= 480 ? 60 : rawMin >= 240 ? 30 : 0;
  const diffMin = Math.max(0, rawMin - breakMin);
  const durH = Math.floor(diffMin / 60);
  const durM = diffMin % 60;
  const durationLabel = `${durH}h ${String(durM).padStart(2, '0')}m`;

  const openPicker = (target: 'start' | 'end') => {
    setPickerTarget(target);
    setTempH(target === 'start' ? startH : endH);
    setTempMIdx(target === 'start' ? startMIdx : endMIdx);
    setPickerKey((k) => k + 1); // WheelColumn 강제 리마운트 → initialized.current 초기화
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    // onScroll로 추적된 최신 인덱스를 ref에서 읽음
    const hIdx = hourWheelRef.current?.getIndex() ?? tempH;
    const mIdx = minWheelRef.current?.getIndex() ?? tempMIdx;
    if (pickerTarget === 'start') {
      setStartH(hIdx);
      setStartMIdx(mIdx);
    } else {
      setEndH(hIdx);
      setEndMIdx(mIdx);
    }
    setPickerVisible(false);
  };

  const handleSave = async () => {
    const logDate = `${year}-${String(month).padStart(2, '0')}-${dateStr.padStart(2, '0')}`;
    const body = JSON.stringify({
      log_date: logDate,
      start_time: formatTime(startH, startMIdx),
      end_time: formatTime(endH, endMIdx),
      fee,
      overtime_hours: overtime,
      is_night_shift: nightShift,
      is_holiday_work: holidayWork,
    });

    if (logId) {
      await fetch(`${API_BASE_URL}/work-logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } else {
      await fetch(`${API_BASE_URL}/work-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>4/{dateStr}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* WORK TIME */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleBlue}>WORK TIME</Text>
          <Text style={styles.sectionSubtitle}>{dayName}</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.infoRow} onPress={() => openPicker('start')} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name="time-outline" size={17} color={Brand.primary} />
            </View>
            <Text style={styles.infoLabel}>START TIME</Text>
            <Text style={styles.infoValue}>{formatTime(startH, startMIdx)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C9CF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.infoRow} onPress={() => openPicker('end')} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name="time-outline" size={17} color={Brand.primary} />
            </View>
            <Text style={styles.infoLabel}>END TIME</Text>
            <Text style={styles.infoValue}>{formatTime(endH, endMIdx)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C9CF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.infoRow} activeOpacity={0.7}>
            <View style={styles.iconCircle}>
              <Ionicons name="receipt-outline" size={17} color={Brand.primary} />
            </View>
            <Text style={styles.infoLabel}>FEE</Text>
            <Text style={styles.infoValue}>{fee ? `₩${fee.toLocaleString()}` : '-'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C4C9CF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* DURATION — start/end 기반 자동 계산 */}
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>DURATION</Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          </View>
        </View>

        {/* OVER TIME */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleDark}>OVER TIME</Text>
          <Text style={styles.sectionSubtitle}>0 – 8 h</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.otControls}>
            <TouchableOpacity
              style={styles.otBtn}
              onPress={() => setOvertime((v) => Math.max(0, Math.round((v - OT_STEP) / OT_STEP) * OT_STEP))}
              activeOpacity={0.7}
            >
              <Text style={styles.otBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.otValueWrap}>
              <Text style={styles.otValueNumber}>{overtime % 1 === 0 ? overtime.toFixed(0) : overtime}</Text>
              <Text style={styles.otValueUnit}>h</Text>
            </View>
            <TouchableOpacity
              style={styles.otBtn}
              onPress={() => setOvertime((v) => Math.min(MAX_OT, Math.round((v + OT_STEP) / OT_STEP) * OT_STEP))}
              activeOpacity={0.7}
            >
              <Text style={styles.otBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <OvertimeSlider value={overtime} onChange={setOvertime} />
        </View>

        {/* Toggles */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Night Shift</Text>
              <Text style={styles.toggleSubtitle}>After 22:00 · +50% rate</Text>
            </View>
            <Switch
              value={nightShift}
              onValueChange={setNightShift}
              trackColor={{ false: '#E5E7EB', true: Brand.primary }}
              thumbColor="#fff"
              ios_backgroundColor="#E5E7EB"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Holiday Work</Text>
              <Text style={styles.toggleSubtitle}>Weekends & holidays · +50%</Text>
            </View>
            <Switch
              value={holidayWork}
              onValueChange={setHolidayWork}
              trackColor={{ false: '#E5E7EB', true: Brand.primary }}
              thumbColor="#fff"
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save to Calendar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── 타임 피커 모달 ── */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={pickerStyles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPickerVisible(false)} />
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.sheetHeader}>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={pickerStyles.cancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={pickerStyles.sheetTitle}>
                {pickerTarget === 'start' ? 'START TIME' : 'END TIME'}
              </Text>
              <TouchableOpacity onPress={confirmPicker}>
                <Text style={pickerStyles.confirmText}>확인</Text>
              </TouchableOpacity>
            </View>

            <View style={pickerStyles.wheelsRow}>
              {/* key 변경 시 리마운트 → initialized.current 리셋 → 초기 위치 재설정 */}
              <WheelColumn
                key={`h-${pickerKey}`}
                ref={hourWheelRef}
                items={HOURS}
                initialIndex={tempH}
              />
              <Text style={pickerStyles.colon}>:</Text>
              <WheelColumn
                key={`m-${pickerKey}`}
                ref={minWheelRef}
                items={MINUTES}
                initialIndex={tempMIdx}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7F9' },
  scroll: { paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#11181C' },
  headerSpacer: { width: 36 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 20, marginBottom: 10,
  },
  sectionTitleBlue: { fontSize: 16, fontWeight: '700', color: Brand.primary, letterSpacing: 0.5 },
  sectionTitleDark: { fontSize: 16, fontWeight: '700', color: Brand.primary, letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 13, color: '#9BA1A6' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 13, color: '#9BA1A6', fontWeight: '500', letterSpacing: 0.3 },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#11181C', marginRight: 6 },

  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  durationLabel: { fontSize: 12, color: '#9BA1A6', fontWeight: '600', letterSpacing: 0.5 },
  durationBadge: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  durationText: { fontSize: 14, fontWeight: '700', color: Brand.primary },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginHorizontal: 16 },

  otControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  otBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  otBtnText: { fontSize: 22, color: '#374151', lineHeight: 26 },
  otValueWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  otValueNumber: { fontSize: 52, fontWeight: '800', color: '#11181C', lineHeight: 58, letterSpacing: -1 },
  otValueUnit: { fontSize: 22, fontWeight: '600', color: '#11181C', marginBottom: 8 },

  sliderWrapper: { position: 'relative', height: 54, marginHorizontal: 20, marginBottom: 20 },
  sliderTrackBg: { position: 'absolute', left: 0, right: 0, top: TRACK_TOP, height: TRACK_HEIGHT, backgroundColor: '#E5E7EB', borderRadius: TRACK_HEIGHT / 2 },
  sliderTrackFill: { position: 'absolute', left: 0, top: TRACK_TOP, height: TRACK_HEIGHT, backgroundColor: Brand.primary, borderRadius: TRACK_HEIGHT / 2 },
  sliderThumb: {
    position: 'absolute', top: THUMB_TOP, width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: Brand.primary, shadowColor: Brand.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4,
  },
  sliderLabels: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 11, color: '#9BA1A6' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  toggleInfo: { flex: 1, gap: 3 },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  toggleSubtitle: { fontSize: 12, color: '#9BA1A6' },

  saveBtn: {
    backgroundColor: Brand.primary, borderRadius: 16, marginHorizontal: 16, marginTop: 24, paddingVertical: 18, alignItems: 'center',
    shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  cancelText: { fontSize: 15, color: '#9BA1A6' },
  confirmText: { fontSize: 15, fontWeight: '700', color: Brand.primary },

  wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 8 },
  colon: { fontSize: 28, fontWeight: '700', color: '#11181C', marginHorizontal: 8, marginBottom: 4 },

  column: { width: 80, height: ITEM_H * 5, overflow: 'hidden' },
  selectionBand: {
    position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H,
    backgroundColor: '#F3F4F6', borderRadius: 10, zIndex: 0,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 22, fontWeight: '400', color: '#C4C9CF' },
  itemTextSelected: { fontWeight: '700', color: '#11181C' },
});
