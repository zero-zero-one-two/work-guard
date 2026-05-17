import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { contractStore } from '@/store/contractStore';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CORNER = 44;
const CORNER_W = 4;
const CORNER_COLOR = '#3182F6';

export default function ContractCameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [images, setImages] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setImages(prev => [...prev, photo.uri]);
      }
    } catch {
      Alert.alert('오류', '사진 촬영에 실패했어요. 다시 시도해 주세요.');
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  }

  function deleteImage(index: number) {
    Alert.alert('페이지 삭제', `${index + 1}페이지를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setImages(prev => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.permContent}>
          <Ionicons name="camera-outline" size={56} color="#9BA1A6" />
          <Text style={styles.permTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permSub}>계약서 촬영을 위해 카메라 접근을 허용해 주세요.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>권한 허용하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>

      {/* 닫기 */}
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>

      {/* 뷰파인더 */}
      <View style={styles.viewfinder}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

        {/* 촬영 가이드 */}
        <View style={styles.guideWrap}>
          <View style={styles.guidePill}>
            <Text style={styles.guidePillText}>문서를 프레임 안에 맞춰주세요</Text>
          </View>
        </View>

        {/* 코너 브라켓 */}
        <View style={[styles.corner, styles.cTL]} />
        <View style={[styles.corner, styles.cTR]} />
        <View style={[styles.corner, styles.cBL]} />
        <View style={[styles.corner, styles.cBR]} />
      </View>

      {/* 하단 컨트롤 */}
      <View style={styles.bottomControls}>

        {/* 페이지 썸네일 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbScroll}
          contentContainerStyle={styles.thumbRow}>
          {images.map((uri, i) => (
            <TouchableOpacity
              key={`${uri}-${i}`}
              style={styles.thumb}
              onLongPress={() => deleteImage(i)}>
              <Image source={{ uri }} style={styles.thumbImage} />
              <Text style={styles.thumbLabel}>{i + 1}p</Text>
            </TouchableOpacity>
          ))}
          {/* 다음 페이지 플레이스홀더 */}
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbLabel}>{images.length + 1}p</Text>
          </View>
          <TouchableOpacity style={styles.thumbAdd} onPress={pickFromGallery}>
            <Ionicons name="add" size={20} color="#9BA1A6" />
          </TouchableOpacity>
        </ScrollView>

        {/* 페이지 카운터 */}
        <Text style={styles.pageCounter}>
          <Text style={styles.pageCounterNum}>{images.length + 1}</Text>
          <Text> / {images.length + 1}페이지</Text>
        </Text>

        {/* 촬영 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={takePicture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, images.length === 0 && styles.ctaBtnDisabled]}
          activeOpacity={0.85}
          disabled={images.length === 0}
          onPress={() => {
            console.log('[camera] CTA 눌림, images.length:', images.length);
            contractStore.setImages(images);
            console.log('[camera] setImages 후 getImages():', contractStore.getImages().length);
            router.replace('/contract/analyzing');
          }}>
          <Text style={styles.ctaBtnText}>
            {images.length === 0
              ? '사진을 추가해 주세요'
              : '촬영 완료 · 분석 시작하기 →'}
          </Text>
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

  // 권한 요청
  permContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  permSub: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    marginTop: 8,
    backgroundColor: '#3182F6',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  permBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // 뷰파인더
  viewfinder: {
    flex: 1,
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 16,
  },

  guideWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  guidePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guidePillText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  corner: { position: 'absolute', width: CORNER, height: CORNER, zIndex: 2 },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: CORNER_COLOR, borderTopLeftRadius: 16 },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: CORNER_COLOR, borderTopRightRadius: 16 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: CORNER_COLOR, borderBottomLeftRadius: 16 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: CORNER_COLOR, borderBottomRightRadius: 16 },

  // 하단
  bottomControls: { gap: 12 },

  thumbScroll: { height: 72 },
  thumbRow: { gap: 8, alignItems: 'center', paddingHorizontal: 4 },
  thumb: {
    width: 52,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#48484A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 0,
  },
  thumbImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
  },
  thumbLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  thumbPlaceholder: {
    width: 52,
    height: 64,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#636366',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 0,
    paddingBottom: 4,
  },

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

  pageCounter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  pageCounterNum: {
    color: '#3182F6',
    fontWeight: '700',
  },

  actionRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  ctaBtnDisabled: { backgroundColor: '#2C2C2E' },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
