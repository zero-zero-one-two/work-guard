import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/constants/api';
import { Brand } from '@/constants/theme';

type DayType = 'work' | 'overtime';

type ScheduleItem = { day: string; date: number; hasWork: boolean; timeRange: string; hours: number };

type WorkLog = {
  id: string;
  log_date: string;
  start_time: string | null;
  end_time: string | null;
  overtime_hours: number;
  is_night_shift: boolean;
  is_holiday_work: boolean;
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

const DAY_COLORS: Record<DayType, string> = {
  work: '#FFE4E4',
  overtime: '#FEF3C7',
};

const MAX_HOURS = 9;

export default function SalaryCalendarScreen() {
  const router = useRouter();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const weeks = buildWeeks(year, month);
  const monthLabel = MONTH_NAMES[month - 1];

  useFocusEffect(
    useCallback(() => {
      const fetchLogs = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/work-logs/${year}/${month}`);
          if (res.ok) {
            const data = await res.json();
            setWorkLogs(data);
          }
        } catch (e) {}
      };
      fetchLogs();
    }, [year, month]),
  );

  // API 데이터로 달력 색상 결정
  const dayTypeMap: Record<number, DayType> = {};
  workLogs.forEach((log) => {
    const day = parseInt(log.log_date.split('-')[2], 10);
    dayTypeMap[day] = log.overtime_hours > 0 ? 'overtime' : 'work';
  });

  // 이번 달 전체 날짜 기반으로 스케줄 생성
  const daysInMonth = new Date(year, month, 0).getDate();
  const scheduleItems: ScheduleItem[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = i + 1;
    const dayOfWeek = new Date(year, month - 1, date).getDay();
    const dayName = WEEK_DAYS[dayOfWeek];
    const log = workLogs.find((l) => parseInt(l.log_date.split('-')[2], 10) === date);
    if (log && log.start_time && log.end_time) {
      const [sh, sm] = log.start_time.split(':').map(Number);
      const [eh, em] = log.end_time.split(':').map(Number);
      const hours = Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60));
      return { day: dayName, date, hasWork: true, timeRange: `${log.start_time}-${log.end_time}`, hours };
    }
    return { day: dayName, date, hasWork: false, timeRange: '', hours: 0 };
  });

  const handleDayPress = (day: number) => {
    router.push(`/(tabs)/salary-calendar/${day}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── 상단 고정: 헤더 + 금액 + 캘린더 ── */}
      <View>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
            <Ionicons name="chevron-back" size={22} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{monthLabel}</Text>
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
          {weeks.map((week, i) => (
            <View key={i} style={styles.weekRow}>
              {week.map((day, j) => {
                const type = day != null ? dayTypeMap[day] : undefined;
                const bg = type ? DAY_COLORS[type] : undefined;
                return day != null ? (
                  <TouchableOpacity
                    key={j}
                    style={[styles.cell, styles.dateCell, bg ? { backgroundColor: bg, borderRadius: 8 } : undefined]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateText}>{day}</Text>
                  </TouchableOpacity>
                ) : (
                  <View key={j} style={[styles.cell, styles.dateCell]} />
                );
              })}
            </View>
          ))}

          {/* 범례 */}
          <View style={styles.legend}>
            {[
              { label: 'Work', color: DAY_COLORS.work },
              { label: 'Over time', color: DAY_COLORS.overtime },
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
        {scheduleItems.map((item) => (
          <TouchableOpacity
            key={item.date}
            style={styles.scheduleCard}
            onPress={() => handleDayPress(item.date)}
            activeOpacity={0.75}
          >
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleDay, !item.hasWork && { color: '#9BA1A6' }]}>{item.day}</Text>
              <Text style={[styles.scheduleDate, !item.hasWork && { color: '#C4C9CF' }]}>{item.date}</Text>
              {item.hasWork && <Text style={styles.scheduleTime}>{item.timeRange}</Text>}
              {item.hasWork && (
                <View style={styles.hoursBadge}>
                  <Text style={styles.hoursText}>{item.hours}h</Text>
                </View>
              )}
            </View>
            <View style={styles.progressTrack}>
              {item.hasWork && (
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((item.hours / MAX_HOURS) * 100)}%` },
                  ]}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
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
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#11181C',
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

});
