import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import {
  CONSULTATION_CENTERS,
  MergedCenter,
  getDistanceKm,
  mergeByName,
} from '@/constants/consultation-centers';

function openNaverMap(center: MergedCenter) {
  const webUrl = `https://map.naver.com/v5/search/${encodeURIComponent(center.name + ' ' + center.address)}`;
  if (Platform.OS === 'web') {
    Linking.openURL(webUrl);
    return;
  }
  const appUrl = `nmap://place?lat=${center.lat}&lng=${center.lng}&name=${encodeURIComponent(center.name)}&appname=com.workguard.app`;
  Linking.canOpenURL(appUrl).then(supported => {
    Linking.openURL(supported ? appUrl : webUrl);
  });
}

function openKakaoMap(center: MergedCenter) {
  const webUrl = `https://map.kakao.com/link/map/${encodeURIComponent(center.name)},${center.lat},${center.lng}`;
  if (Platform.OS === 'web') {
    Linking.openURL(webUrl);
    return;
  }
  const appUrl = `kakaomap://look?p=${center.lat},${center.lng}`;
  Linking.canOpenURL(appUrl).then(supported => {
    Linking.openURL(supported ? appUrl : webUrl);
  });
}

export default function GetHelpScreen() {
  const [centers, setCenters] = useState<MergedCenter[]>([]);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');

  useEffect(() => {
    loadCenters();
  }, []);

  async function loadCenters() {
    setLocationStatus('loading');
    const merged = mergeByName(CONSULTATION_CENTERS);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      setCenters(merged);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const withDist = merged.map(c => ({
        ...c,
        distanceKm: getDistanceKm(latitude, longitude, c.lat, c.lng),
      }));
      withDist.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      setCenters(withDist);
      setLocationStatus('done');
    } catch {
      setLocationStatus('denied');
      setCenters(merged);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get Help</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>This needs an expert</Text>
          <Text style={styles.bannerDesc}>
            A labor counselor can help you file a complaint – for free.
          </Text>
        </View>

        {/* Location status */}
        {locationStatus === 'loading' && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={Brand.primary} />
            <Text style={styles.statusText}>내 위치를 기반으로 가까운 센터를 찾는 중...</Text>
          </View>
        )}
        {locationStatus === 'done' && (
          <View style={styles.statusRow}>
            <Ionicons name="location" size={14} color={Brand.primary} />
            <Text style={styles.statusText}>현재 위치 기준으로 가까운 순서로 정렬되었습니다.</Text>
          </View>
        )}
        {locationStatus === 'denied' && (
          <View style={styles.statusRow}>
            <Ionicons name="location-outline" size={14} color="#9BA1A6" />
            <Text style={[styles.statusText, { color: '#9BA1A6' }]}>
              위치 권한이 없어 전체 목록을 표시합니다.
            </Text>
          </View>
        )}

        {/* Center Cards */}
        {centers.map(center => (
          <View key={center.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName}>{center.name}</Text>
                {center.distanceKm !== undefined && (
                  <Text style={styles.distanceBadge}>
                    {center.distanceKm < 1
                      ? `${Math.round(center.distanceKm * 1000)}m`
                      : `${center.distanceKm.toFixed(1)}km`}
                  </Text>
                )}
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Free</Text>
              </View>
            </View>

            <Text style={styles.addressText}>{center.address}</Text>

            {center.entries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                <View style={styles.langTagRow}>
                  {entry.languages.map(lang => (
                    <View key={lang} style={styles.langTag}>
                      <Text style={styles.langTagText}>{lang}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.phoneText}>{entry.phone}</Text>
              </View>
            ))}

            {/* Map buttons */}
            <View style={styles.mapButtonRow}>
              <TouchableOpacity style={styles.mapButton} onPress={() => openNaverMap(center)}>
                <Ionicons name="map-outline" size={14} color={Brand.primary} />
                <Text style={styles.mapButtonText}>네이버 지도</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mapButton, styles.kakaoButton]} onPress={() => openKakaoMap(center)}>
                <Ionicons name="map-outline" size={14} color="#3C1E1E" />
                <Text style={[styles.mapButtonText, { color: '#3C1E1E' }]}>카카오맵</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 },
  banner: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, color: Brand.primary },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#11181C' },
  distanceBadge: { fontSize: 11, color: Brand.primary, fontWeight: '600' },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeBadgeText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  addressText: { fontSize: 12, color: '#9BA1A6' },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
    gap: 4,
  },
  langTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  langTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  langTagText: { fontSize: 11, color: '#1D4ED8', fontWeight: '500' },
  phoneText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  mapButtonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  kakaoButton: {
    borderColor: '#FEE500',
    backgroundColor: '#FEE500',
  },
  mapButtonText: { fontSize: 12, color: Brand.primary, fontWeight: '600' },
});
