export interface AnalysisItem {
  id: number;
  status: 'violation' | 'warning' | 'normal' | 'unknown';
  law: string | null;
  title: string;
  evidence: string | null;
  description: string;
  actionLabel: string | null;
}

export interface AnalysisSummary {
  violation: number;
  warning: number;
  normal: number;
  unknown: number;
}

export interface AnalysisResult {
  is_clean: boolean;
  summary: AnalysisSummary;
  items: AnalysisItem[];
  ocr_text: string;
  model_used: string;
  backend_used: string;
  elapsed_sec: number;
}

// globalThis 사용: 모듈 재평가(Expo Go 핫 리로드) 후에도 데이터 유지
const g = globalThis as any;

export const contractStore = {
  setImages(images: string[]) { g.__wg_images = images; },
  getImages(): string[] { return g.__wg_images ?? []; },
  setResult(result: AnalysisResult) { g.__wg_result = result; },
  getResult(): AnalysisResult | null { return g.__wg_result ?? null; },
  clear() { g.__wg_images = []; g.__wg_result = null; },
};
