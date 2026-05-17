export interface ConsultationCenter {
  id: string;
  name: string;
  languages: string[];
  phone: string;
  lat: number;
  lng: number;
  address: string;
}

export const CONSULTATION_CENTERS: ConsultationCenter[] = [
  // 중부청
  { id: 'c1', name: '중부청', languages: ['우즈벡어', '러시아어'], phone: '032-460-7135', lat: 37.4500, lng: 126.7052, address: '인천광역시 미추홀구' },
  { id: 'c2', name: '중부청', languages: ['태국어'], phone: '032-460-7136', lat: 37.4500, lng: 126.7052, address: '인천광역시 미추홀구' },
  { id: 'c3', name: '중부청', languages: ['베트남어'], phone: '032-460-7137', lat: 37.4500, lng: 126.7052, address: '인천광역시 미추홀구' },
  // 인천북부지청
  { id: 'c4', name: '인천북부지청', languages: ['캄보디아어'], phone: '032-540-2097', lat: 37.5450, lng: 126.6822, address: '인천광역시 계양구' },
  // 부천지청
  { id: 'c5', name: '부천지청', languages: ['방글라데시어', '영어'], phone: '031-999-0907', lat: 37.5034, lng: 126.7612, address: '경기도 부천시' },
  { id: 'c6', name: '부천지청', languages: ['인도네시아어'], phone: '031-999-0908', lat: 37.5034, lng: 126.7612, address: '경기도 부천시' },
  // 의정부지청
  { id: 'c7', name: '의정부지청', languages: ['몽골어'], phone: '031-828-0824', lat: 37.7382, lng: 127.0337, address: '경기도 의정부시' },
  { id: 'c8', name: '의정부지청', languages: ['네팔어', '파키스탄(우르두)어'], phone: '031-828-0823', lat: 37.7382, lng: 127.0337, address: '경기도 의정부시' },
  { id: 'c9', name: '의정부지청', languages: ['베트남어'], phone: '031-828-0902', lat: 37.7382, lng: 127.0337, address: '경기도 의정부시' },
  { id: 'c10', name: '의정부지청', languages: ['캄보디아어'], phone: '031-828-0901', lat: 37.7382, lng: 127.0337, address: '경기도 의정부시' },
  { id: 'c11', name: '의정부지청', languages: ['미얀마어'], phone: '031-828-0903', lat: 37.7382, lng: 127.0337, address: '경기도 의정부시' },
  // 경기지청
  { id: 'c12', name: '경기지청', languages: ['우즈벡어'], phone: '031-290-0879', lat: 37.2636, lng: 127.0286, address: '경기도 수원시' },
  { id: 'c13', name: '경기지청', languages: ['미얀마어'], phone: '031-289-2208', lat: 37.2636, lng: 127.0286, address: '경기도 수원시' },
  { id: 'c14', name: '경기지청', languages: ['캄보디아어'], phone: '031-290-0880', lat: 37.2636, lng: 127.0286, address: '경기도 수원시' },
  { id: 'c15', name: '경기지청', languages: ['네팔어'], phone: '031-290-0876', lat: 37.2636, lng: 127.0286, address: '경기도 수원시' },
  { id: 'c16', name: '경기지청', languages: ['태국어'], phone: '031-290-0888', lat: 37.2636, lng: 127.0286, address: '경기도 수원시' },
  // 안양지청
  { id: 'c17', name: '안양지청', languages: ['베트남어'], phone: '031-463-0774', lat: 37.3942, lng: 126.9568, address: '경기도 안양시' },
  // 안산지청
  { id: 'c18', name: '안산지청', languages: ['미얀마어'], phone: '031-496-1923', lat: 37.3219, lng: 126.8309, address: '경기도 안산시' },
  // 평택지청
  { id: 'c19', name: '평택지청', languages: ['인도네시아어'], phone: '031-646-1217', lat: 36.9940, lng: 127.0899, address: '경기도 평택시' },
  { id: 'c20', name: '평택지청', languages: ['중국어'], phone: '031-646-1213', lat: 36.9940, lng: 127.0899, address: '경기도 평택시' },
  // 원주지청
  { id: 'c21', name: '원주지청', languages: ['영어', '인도어'], phone: '033-769-0952', lat: 37.3423, lng: 127.9208, address: '강원도 원주시' },
  // 부산청
  { id: 'c22', name: '부산청', languages: ['영어', '인도네시아어'], phone: '051-860-2026', lat: 35.1797, lng: 129.0756, address: '부산광역시 부산진구' },
  // 부산동부지청
  { id: 'c23', name: '부산동부지청', languages: ['인도네시아어'], phone: '051-559-6606', lat: 35.1580, lng: 129.1604, address: '부산광역시 해운대구' },
  // 부산북부지청
  { id: 'c24', name: '부산북부지청', languages: ['우즈벡어'], phone: '051-330-9925', lat: 35.2325, lng: 129.0837, address: '부산광역시 북구' },
  // 창원지청
  { id: 'c25', name: '창원지청', languages: ['중국어'], phone: '055-239-3553', lat: 35.2391, lng: 128.6923, address: '경상남도 창원시' },
  { id: 'c26', name: '창원지청', languages: ['필리핀어', '영어'], phone: '055-239-3552', lat: 35.2391, lng: 128.6923, address: '경상남도 창원시' },
  { id: 'c27', name: '창원지청', languages: ['우즈벡어', '러시아어'], phone: '055-239-3551', lat: 35.2391, lng: 128.6923, address: '경상남도 창원시' },
  { id: 'c28', name: '창원지청', languages: ['네팔어', '힌디어'], phone: '055-239-3554', lat: 35.2391, lng: 128.6923, address: '경상남도 창원시' },
  // 울산지청
  { id: 'c29', name: '울산지청', languages: ['우즈벡어', '카자흐어'], phone: '052-228-1913', lat: 35.5384, lng: 129.3114, address: '울산광역시' },
  // 양산지청
  { id: 'c30', name: '양산지청', languages: ['미얀마어'], phone: '055-330-6448', lat: 35.3350, lng: 129.0366, address: '경상남도 양산시' },
  { id: 'c31', name: '양산지청', languages: ['영어', '러시아어'], phone: '055-330-6450', lat: 35.3350, lng: 129.0366, address: '경상남도 양산시' },
  { id: 'c32', name: '양산지청', languages: ['캄보디아어'], phone: '055-330-6451', lat: 35.3350, lng: 129.0366, address: '경상남도 양산시' },
  { id: 'c33', name: '양산지청', languages: ['중국어'], phone: '055-330-6432', lat: 35.3350, lng: 129.0366, address: '경상남도 양산시' },
  { id: 'c34', name: '양산지청', languages: ['네팔어', '힌디어'], phone: '055-330-6446', lat: 35.3350, lng: 129.0366, address: '경상남도 양산시' },
  // 진주지청
  { id: 'c35', name: '진주지청', languages: ['베트남어'], phone: '055-760-6758', lat: 35.1956, lng: 128.1077, address: '경상남도 진주시' },
  { id: 'c36', name: '진주지청', languages: ['베트남어'], phone: '055-760-6759', lat: 35.1956, lng: 128.1077, address: '경상남도 진주시' },
  // 통영지청
  { id: 'c37', name: '통영지청', languages: ['베트남어'], phone: '055-730-1922', lat: 34.8543, lng: 128.4335, address: '경상남도 통영시' },
  // 대구청
  { id: 'c38', name: '대구청', languages: ['중국어'], phone: '053-667-6047', lat: 35.8688, lng: 128.6065, address: '대구광역시' },
  { id: 'c39', name: '대구청', languages: ['네팔어', '파키스탄어'], phone: '053-667-6048', lat: 35.8688, lng: 128.6065, address: '대구광역시' },
  // 대구서부지청
  { id: 'c40', name: '대구서부지청', languages: ['캄보디아어'], phone: '053-605-6574', lat: 35.8714, lng: 128.5489, address: '대구광역시 달서구' },
  { id: 'c41', name: '대구서부지청', languages: ['인도네시아어'], phone: '053-605-6576', lat: 35.8714, lng: 128.5489, address: '대구광역시 달서구' },
  { id: 'c42', name: '대구서부지청', languages: ['필리핀어', '영어'], phone: '053-605-6575', lat: 35.8714, lng: 128.5489, address: '대구광역시 달서구' },
  // 포항지청
  { id: 'c43', name: '포항지청', languages: ['베트남어'], phone: '054-288-3500', lat: 36.0190, lng: 129.3435, address: '경상북도 포항시' },
  // 광주청
  { id: 'c44', name: '광주청', languages: ['네팔어'], phone: '062-609-8686', lat: 35.1595, lng: 126.8526, address: '광주광역시' },
  { id: 'c45', name: '광주청', languages: ['캄보디아어'], phone: '062-609-8687', lat: 35.1595, lng: 126.8526, address: '광주광역시' },
  { id: 'c46', name: '광주청', languages: ['베트남어'], phone: '062-609-8688', lat: 35.1595, lng: 126.8526, address: '광주광역시' },
  { id: 'c47', name: '광주청', languages: ['인도네시아어', '동티모르어'], phone: '062-609-8689', lat: 35.1595, lng: 126.8526, address: '광주광역시' },
  // 익산지청
  { id: 'c48', name: '익산지청', languages: ['네팔어', '힌디어'], phone: '063-839-0040', lat: 35.9482, lng: 126.9540, address: '전라북도 익산시' },
  // 군산지청
  { id: 'c49', name: '군산지청', languages: ['베트남어'], phone: '063-450-0607', lat: 35.9670, lng: 126.7369, address: '전라북도 군산시' },
  // 대전청
  { id: 'c50', name: '대전청', languages: ['베트남어'], phone: '042-470-8326', lat: 36.3505, lng: 127.3845, address: '대전광역시' },
  { id: 'c51', name: '대전청', languages: ['캄보디아어'], phone: '042-470-8328', lat: 36.3505, lng: 127.3845, address: '대전광역시' },
  // 청주지청
  { id: 'c52', name: '청주지청', languages: ['필리핀어', '영어'], phone: '043-229-0755', lat: 36.6424, lng: 127.4890, address: '충청북도 청주시' },
  // 천안지청
  { id: 'c53', name: '천안지청', languages: ['네팔어'], phone: '041-620-9582', lat: 36.8151, lng: 127.1139, address: '충청남도 천안시' },
  { id: 'c54', name: '천안지청', languages: ['베트남어'], phone: '041-620-7465', lat: 36.8151, lng: 127.1139, address: '충청남도 천안시' },
  { id: 'c55', name: '천안지청', languages: ['캄보디아어'], phone: '041-620-9553', lat: 36.8151, lng: 127.1139, address: '충청남도 천안시' },
  { id: 'c56', name: '천안지청', languages: ['키르기스어', '러시아어'], phone: '041-620-9583', lat: 36.8151, lng: 127.1139, address: '충청남도 천안시' },
  // 충주지청
  { id: 'c57', name: '충주지청', languages: ['네팔어', '영어'], phone: '043-850-4052', lat: 36.9917, lng: 127.9250, address: '충청북도 충주시' },
  { id: 'c58', name: '충주지청', languages: ['베트남어'], phone: '043-850-4051', lat: 36.9917, lng: 127.9250, address: '충청북도 충주시' },
  // 보령지청
  { id: 'c59', name: '보령지청', languages: ['베트남어'], phone: '041-930-6267', lat: 36.3334, lng: 126.6132, address: '충청남도 보령시' },
];

/** Haversine 거리 계산 (km) */
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 같은 name을 가진 센터들을 하나로 합쳐서 반환 (언어 목록 병합) */
export interface MergedCenter {
  key: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  entries: { languages: string[]; phone: string }[];
  distanceKm?: number;
}

export function mergeByName(centers: ConsultationCenter[]): MergedCenter[] {
  const map = new Map<string, MergedCenter>();
  for (const c of centers) {
    if (!map.has(c.name)) {
      map.set(c.name, { key: c.name, name: c.name, address: c.address, lat: c.lat, lng: c.lng, entries: [] });
    }
    map.get(c.name)!.entries.push({ languages: c.languages, phone: c.phone });
  }
  return Array.from(map.values());
}
