import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiWithTimeout, cleanJsonText, SYSTEM_INSTRUCTION_CONSULTANT, Type } from './_lib/gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed (POST required)' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: '유효한 JSON 요청 본문이 아닙니다.' });
      }
    }

    const { issueTopic, targetJob, major } = body || {};
    if (!issueTopic || typeof issueTopic !== 'string') {
      return res.status(400).json({ error: '이슈 주제를 전달해주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const prompt = `
[모빌리티 산업 이슈 주제]
${issueTopic}

[지원자 정보]
- 희망 직무: ${targetJob || '모빌리티 연구개발/엔지니어링/사업기획'}
- 전공: ${major || '공학/상경'}

1. 위 모빌리티 이슈에 대해 취업준비생이 반드시 알아야 할 3줄 요약(배경 - 현황 - 시사점)을 작성하세요.
2. 이 이슈와 관련하여 실제 면접관이 지원자의 직무(${targetJob || '모빌리티 엔지니어링'})에 물어볼 만한 고품질 실전 면접 질문 3개를 추출하세요.
각 질문마다 면접관의 의도와 모빌리티 직무 연계 포인트를 함께 설명하세요.
반드시 아래 JSON 스키마로 응답하세요.
`;

    const response = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issueTopic: { type: Type.STRING },
            summary: {
              type: Type.OBJECT,
              properties: {
                background: { type: Type.STRING },
                currentStatus: { type: Type.STRING },
                implication: { type: Type.STRING },
              },
              required: ['background', 'currentStatus', 'implication'],
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  intent: { type: Type.STRING },
                  mobilityRelevance: { type: Type.STRING },
                },
                required: ['id', 'question', 'intent', 'mobilityRelevance'],
              },
            },
          },
          required: ['issueTopic', 'summary', 'questions'],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel issue-brief error:', error?.message);
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || '이슈 브리프 생성 중 오류가 발생했습니다.',
    });
  }
}
