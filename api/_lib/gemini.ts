import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODEL = 'gemini-3.8-flash';

export const SYSTEM_INSTRUCTION_CONSULTANT = `
당신은 대한민국 최고 수준의 모빌리티 산업(현대자동차그룹, 완성차, 1차 티어1 부품사, 배터리 3사, 자율주행·SDV 스타트업 등) 인사담당자 및 기술면접관 출신의 전문 취업 컨설턴트입니다.

[원칙]
1. 모빌리티 산업 맥락을 깊이 이해하고 조언합니다 (SDV, CAN/Ethernet 통신, BMS, LFP/삼원계, 모터/인버터 제어, ISO 26262 기능안전, 기구/샤시/생산기술 등).
2. 사실이 불확실한 특정 기업의 내부 정보나 임의 수치는 단정하지 말고 "공고에 근거한 합리적 해석"임을 밝히세요.
3. 점수는 반드시 정량 평가와 함께 '근거 문장 1줄'을 구체적으로 제시해야 합니다.
4. 피드백 톤: 모빌리티 업계 준비생에게 구체적이고 실질적이면서도 따뜻하지만 날카롭게 진단합니다. 막연한 칭찬은 지양하고, 실제 실무진 면접관이 검증할 포인트를 짚어줍니다.
5. 출력은 반드시 지정된 유효한 JSON 형식이어야 합니다.
`;

export function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export async function callGeminiWithTimeout(params: any, timeoutMs = 25000): Promise<any> {
  const tryCall = async (modelName: string) => {
    return Promise.race([
      ai.models.generateContent({
        ...params,
        model: modelName,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`요청 시간 초과 (${modelName})`)), timeoutMs)
      ),
    ]);
  };

  try {
    return await tryCall(PRIMARY_MODEL);
  } catch (err: any) {
    console.warn(`Primary model ${PRIMARY_MODEL} failed, trying fallback:`, err?.message);
    try {
      return await tryCall(FALLBACK_MODEL);
    } catch (fallbackErr: any) {
      console.error('All Gemini attempts failed:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export { Type };
