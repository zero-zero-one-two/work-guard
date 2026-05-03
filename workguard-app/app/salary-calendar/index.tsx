import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

type DayType = 'work' | 'overtime' | 'off';

type WorkItem = { day: string; date: number; type: 'work'; timeRange: string; hours: number };
type OffItem = { day: string; date: number; type: 'off' };
type ScheduleItem = WorkItem | OffItem;

const DAY_TYPE_MAP: Record<number, DayType> = {
  3: 'work', 4: 'work', 11: 'work', 18: 'work', 19: 'work',
  5: 'overtime', 6: 'overtime', 14: 'overtime', 15: 'overtime',
  21: 'overtime', 27: 'overtime', 28: 'overtime',
  7: 'off', 8: 'off', 25: 'off',
};

const WEEKS: (number | null)[][] = [
  [null, null, null, null, 1, 2, null],
  [3, 4, 5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23],
  [24, 25, 26, 27, 28, 29, 30],
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEK_SCHEDULE: ScheduleItem[] = [
  { day: 'Mon', date: 21, type: 'work', timeRange: '9:00-18:00', hours: 9 },
  { day: 'Tue', date: 22, type: 'work', timeRange: '9:00-18:00', hours: 9 },
  { day: 'Wed', date: 23, type: 'work', timeRange: '9:00-14:00', hours: 5 },
  { day: 'Thu', date: 24, type: 'work', timeRange: '12:00-18:00', hours: 6 },
  { day: 'Fri', date: 25, type: 'off' },
  { day: 'Sat', date: 26, type: 'off' },
  { day: 'Sun', date: 27, type: 'off' },
];

const DAY_COLORS: Record<DayType, string> = {
  work: '#FFE4E4',
  overtime: '#FEF3C7',
  off: '#DCFCE7',
};

const MAX_HOURS = 9;

export default function SalaryCalendarScreen() {
  const router = useRouter();

  const handleDayPress = (day: number) => {
    router.push(`/salary-calendar/${day}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── 상단 고정: 헤더 + 금액 + 캘린더 ── */}
      <View>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>April</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amount}>₩1,842,000</Text>
          <Text style={styles.amountSub}>expected per month</Text>
        </View>

        <View style={styles.calendarCard}>
          {/* 요일 헤더 */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <View key={d} style={styles.cell}>
                <Text style={styles.weekDayLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {WEEKS.map((week, i) => (
            <View key={i} style={styles.weekRow}>
              {week.map((day, j) => {
                const type = day != null ? DAY_TYPE_MAP[day] : undefined;
                const bg = type ? DAY_COLORS[type] : undefined;
                const tappable = day != null && type != null;
                return tappable ? (
                  <TouchableOpacity
                    key={j}
                    style={[styles.cell, styles.dateCell, { backgroundColor: bg, borderRadius: 8 }]}
                    onPress={() => handleDayPress(day!)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateText}>{day}</Text>
                  </TouchableOpacity>
                ) : (
                  <View key={j} style={[styles.cell, styles.dateCell]}>
                    {day != null && <Text style={styles.dateText}>{day}</Text>}
                  </View>
                );
              })}
            </View>
          ))}

          {/* 범례 */}
          <View style={styles.legend}>
            {[
              { label: 'Work', color: DAY_COLORS.work },
              { label: 'Over time', color: DAY_COLORS.overtime },
              { label: 'Off', color: DAY_COLORS.off },
            ].map(({ label, color }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── 하단 독립 스크롤: 이번 주 스케줄 ── */}
      <ScrollView
        style={styles.scheduleScroll}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
      >
        {WEEK_SCHEDULE.map((item) =>
          item.type === 'work' ? (
            <TouchableOpacity
              key={item.date}
              style={styles.scheduleCard}
              onPress={() => handleDayPress(item.date)}
              activeOpacity={0.75}
            >
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>{item.day}</Text>
                <Text style={styles.scheduleDate}>{item.date}</Text>
                <Text style={styles.scheduleTime}>{item.timeRange}</Text>
                <View style={styles.hoursBadge}>
                  <Text style={styles.hoursText}>{item.hours}h</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((item.hours / MAX_HOURS) * 100)}%` },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={item.date}
              style={[styles.scheduleCard, styles.offCard]}
              onPress={() => handleDayPress(item.date)}
              activeOpacity={0.75}
            >
              <View style={[styles.scheduleRow, { marginBottom: 0 }]}>
                <Text style={[styles.scheduleDay, styles.offDayText]}>{item.day}</Text>
                <Text style={[styles.scheduleDate, styles.offDateText]}>{item.date}</Text>
                <View style={{ flex: 1 }} />
                <View style={styles.offBadge}>
                  <Text style={styles.offBadgeText}>Off</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  headerSpacer: {
    width: 36,
  },

  // Amount
  amountSection: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: Brand.primary,
    letterSpacing: -0.5,
  },
  amountSub: {
    fontSize: 14,
    color: Brand.primary,
    marginTop: 2,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  // 날짜 셀: 좌상단 정렬
  dateCell: {
    height: 38,
    marginHorizontal: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 5,
    paddingLeft: 5,
  },
  dateText: {
    fontSize: 13,
    color: '#11181C',
    fontWeight: '400',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    color: '#687076',
  },

  // Schedule scroll section (독립 스크롤)
  scheduleScroll: {
    flex: 1,
    marginTop: 16,
  },
  scheduleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },

  // Work day card
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    width: 44,
  },
  scheduleDate: {
    fontSize: 14,
    color: '#687076',
    width: 28,
  },
  scheduleTime: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
    textAlign: 'center',
  },
  hoursBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 42,
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: Brand.primary,
    borderRadius: 3,
  },

  // Off day card
  offCard: {
    paddingBottom: 16,
  },
  offDayText: {
    color: '#9BA1A6',
  },
  offDateText: {
    color: '#C4C9CF',
  },
  offBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 42,
    alignItems: 'center',
  },
  offBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
});
