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

    const { originalQuestion, originalAnswer, followUpQuestion, followUpAnswer, userProfile } = body || {};
    if (!followUpAnswer || typeof followUpAnswer !== 'string') {
      return res.status(400).json({ error: '꼬리질문 답변을 입력해주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const prompt = `
[원래 면접 질문] ${originalQuestion}
[지원자의 1차 답변] ${originalAnswer}
[면접관의 꼬리 질문] ${followUpQuestion}
[지원자의 꼬리질문 답변]
${followUpAnswer}

[지원자 직무] ${userProfile?.targetJob || '모빌리티 분야'}

면접관으로서 꼬리질문 답변에 대한 총평 피드백(2~3문장)과 1차 답변 대비 방어/논리력 변화 평가를 JSON으로 작성해주세요.
`;

    const response = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedbackText: { type: Type.STRING },
            scoreChange: { type: Type.STRING },
          },
          required: ['feedbackText', 'scoreChange'],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel interview-followup error:', error?.message);
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || '꼬리질문 피드백 생성 중 오류가 발생했습니다.',
    });
  }
}
