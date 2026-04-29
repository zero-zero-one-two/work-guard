import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ContractLayout } from '@/components/contract/contract-layout';

const BAD_EXAMPLES = [
  {
    icon: 'ellipse' as const,
    iconColor: '#1C1C1E',
    label: '너무 어두움',
    bg: '#FFF0F0',
    border: '#FFCDD2',
    textColor: '#E53E3E',
  },
  {
    icon: 'cut-outline' as const,
    iconColor: '#E53E3E',
    label: '일부만 찍힘',
    bg: '#FFF0F0',
    border: '#FFCDD2',
    textColor: '#E53E3E',
  },
  {
    icon: 'warning-outline' as const,
    iconColor: '#D97706',
    label: '심하게 기울어짐',
    bg: '#FFFBEB',
    border: '#FDE68A',
    textColor: '#D97706',
  },
];

function DocumentMockup() {
  return (
    <View style={styles.docMockup}>
      <View style={styles.docPage}>
        {[80, 95, 70, 90, 60, 85, 75].map((w, i) => (
          <View key={i} style={[styles.docLine, { width: `${w}%` as any }]} />
        ))}
      </View>
      <View style={styles.docCheckBadge}>
        <Ionicons name="checkmark-circle" size={26} color="#16A34A" />
      </View>
    </View>
  );
}

export default function ContractUploadScreen() {
  const navigation = useNavigation();
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
      step={1}
      rightAction="home"
      onBack={handleClose}
      onRightAction={handleClose}>
      <View style={styles.container}>

        {/* 안내 문구 */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{'계약서를\n등록해 주세요'}</Text>
          <Text style={styles.subtitle}>
            {'사진을 찍거나 파일을 올려주시면\n한국 노동법 기준으로 분석해 드려요.'}
          </Text>
        </View>

        {/* 촬영 가이드 */}
        <View style={styles.guideSection}>
          <Text style={styles.guideTitle}>📷 이렇게 찍어주세요</Text>
          <View style={styles.guideRow}>
            {/* 올바른 예시 */}
            <View style={styles.goodCard}>
              <DocumentMockup />
              <View style={styles.goodLabel}>
                <Text style={styles.goodLabelTitle}>올바른 예시</Text>
                <Text style={styles.goodLabelDesc}>{'펼친 상태 · 전체 보임\n밝은 곳에서 촬영'}</Text>
              </View>
            </View>

            {/* 잘못된 예시 */}
            <View style={styles.badList}>
              {BAD_EXAMPLES.map(item => (
                <View
                  key={item.label}
                  style={[styles.badChip, { backgroundColor: item.bg, borderColor: item.border }]}>
                  <Ionicons name={item.icon} size={15} color={item.iconColor} />
                  <Text style={[styles.badChipText, { color: item.textColor }]}>{item.label}</Text>
                  <Ionicons name="close" size={13} color={item.textColor} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 카메라 버튼 */}
        <TouchableOpacity
          style={styles.cameraBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/contract/camera')}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
          <Text style={styles.cameraBtnText}>카메라로 촬영하기</Text>
        </TouchableOpacity>

        {/* 구분선 */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 보조 버튼 */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={24} color="#11181C" />
            <Text style={styles.secondaryBtnText}>사진 보관함</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8}>
            <Ionicons name="document-outline" size={24} color="#11181C" />
            <Text style={styles.secondaryBtnText}>파일 앱에서 선택</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ContractLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  titleSection: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#11181C',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },

  guideSection: {
    gap: 12,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  guideRow: {
    flexDirection: 'row',
    gap: 10,
  },

  goodCard: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  docMockup: {
    position: 'relative',
    alignItems: 'center',
  },
  docPage: {
    width: 72,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  docLine: {
    height: 5,
    backgroundColor: '#D1FAE5',
    borderRadius: 3,
  },
  docCheckBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  goodLabel: {
    alignItems: 'center',
    gap: 3,
  },
  goodLabelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  goodLabelDesc: {
    fontSize: 11,
    color: '#16A34A',
    textAlign: 'center',
    lineHeight: 16,
  },

  badList: {
    flex: 1,
    gap: 8,
    justifyContent: 'space-between',
  },
  badChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 6,
  },
  badChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3182F6',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  cameraBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9BA1A6',
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
});
