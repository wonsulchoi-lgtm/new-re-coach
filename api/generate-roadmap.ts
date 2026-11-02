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

    const { jobAnalysis, userProfile } = body || {};
    if (!jobAnalysis) {
      return res.status(400).json({ error: '공고 분석 결과가 필요합니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const prompt = `
[목표 직무]
- 추정 기업/직무: ${jobAnalysis.estimatedCompany} - ${jobAnalysis.estimatedJobTitle} (${jobAnalysis.domainCategory})
- 핵심 키워드: ${(jobAnalysis.topKeywords || []).join(', ')}

[지원자의 부족 역량 목록]
${JSON.stringify(jobAnalysis.missingCompetencies, null, 2)}

[지원자 프로필 요약]
- 전공: ${userProfile?.major}
- 보유 스킬: ${(userProfile?.skills || []).join(', ')}

위 부족 역량을 4주 안에 체계적으로 보완하여 서류/면접 통과 가능성을 극대화할 수 있는 '4주 맞춤 보완 로드맵'을 작성해주세요.
주차별로 모빌리티 실무에서 바로 통할 수 있는 현실적인 행동 과제(주당 2~3개)와 산출물 팁(예: 노션 정리, 깃허브 코드, 실험 데이터 분석서 등)을 명확히 제시하세요.
반드시 아래 JSON 스키마로 반환하세요.
`;

    const response = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              week: { type: Type.INTEGER },
              theme: { type: Type.STRING },
              description: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    deliverableTip: { type: Type.STRING },
                  },
                  required: ['id', 'text', 'deliverableTip'],
                },
              },
            },
            required: ['week', 'theme', 'description', 'tasks'],
          },
        },
      },
    });

    const text = response?.text || '[]';
    const parsed = JSON.parse(cleanJsonText(text));
    const formatted = parsed.map((w: any, wIdx: number) => ({
      ...w,
      week: w.week || wIdx + 1,
      tasks: (w.tasks || []).map((t: any, tIdx: number) => ({
        id: t.id || `w${wIdx + 1}-t${tIdx + 1}`,
        text: t.text,
        done: false,
        deliverableTip: t.deliverableTip || '',
      })),
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Vercel generate-roadmap error:', error?.message);
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || '로드맵 생성 중 오류가 발생했습니다.',
    });
  }
}
