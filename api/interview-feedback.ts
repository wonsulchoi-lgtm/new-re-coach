import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiWithTimeout, cleanJsonText, SYSTEM_INSTRUCTION_CONSULTANT, Type } from './_lib/gemini';

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

    const { issueTopic, question, userAnswer, userProfile } = body || {};
    if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length < 5) {
      return res.status(400).json({ error: '답변을 최소 5자 이상 작성해주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const prompt = `
[산업 이슈] ${issueTopic}
[면접 질문] ${question}
[지원자 희망 직무] ${userProfile?.targetJob || '모빌리티 엔지니어링'} (전공: ${userProfile?.major || '미입력'})
[지원자가 작성한 답변]
${userAnswer}

당신은 실제 모빌리티 기업(현대차, 모비스, 배터리 등)의 베테랑 면접관입니다.
지원자의 답변을 4개 항목(논리성, 산업 이해도, 직무 연결성, 구체성 - 각 5점 만점)으로 엄정하게 평가하고 건설적인 피드백을 주세요.

평가 기준:
- 논리성 (1~5점): 두괄식 구성, 근거와 주장의 일관성
- 산업 이해도 (1~5점): 최신 모빌리티 트렌드, 기술 동향(SDV, 전동화, 플랫폼 등)의 정확한 이해
- 직무 연결성 (1~5점): 본인이 지원하는 직무의 관점과 역할이 녹아있는가
- 구체성 (1~5점): 추상적인 구호가 아닌 구체적인 사례, 기술 키워드, 해결 방안 제시

추가 요구:
- 각 점수마다 1줄 평가 근거 제시
- 잘한 점 2개
- 보완할 점 2개
- 모범 개선 답변 예시 (3~4문장)
- 면접관의 예리한 꼬리질문 1개

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
            overallScore: { type: Type.INTEGER },
            scores: {
              type: Type.OBJECT,
              properties: {
                logic: { type: Type.INTEGER },
                industryKnowledge: { type: Type.INTEGER },
                jobAlignment: { type: Type.INTEGER },
                concreteness: { type: Type.INTEGER },
              },
              required: ['logic', 'industryKnowledge', 'jobAlignment', 'concreteness'],
            },
            scoreRationales: {
              type: Type.OBJECT,
              properties: {
                logic: { type: Type.STRING },
                industryKnowledge: { type: Type.STRING },
                jobAlignment: { type: Type.STRING },
                concreteness: { type: Type.STRING },
              },
              required: ['logic', 'industryKnowledge', 'jobAlignment', 'concreteness'],
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvedAnswerExample: { type: Type.STRING },
            followUpQuestion: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'scores',
            'scoreRationales',
            'strengths',
            'improvements',
            'improvedAnswerExample',
            'followUpQuestion',
          ],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel interview-feedback error:', error?.message);
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || '면접 피드백 생성 중 오류가 발생했습니다.',
    });
  }
}
