import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiWithTimeout, cleanJsonText, SYSTEM_INSTRUCTION_CONSULTANT, Type } from './_lib/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & Methods
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

    const { jobPosting, userProfile } = body || {};
    if (!jobPosting || typeof jobPosting !== 'string' || jobPosting.trim().length < 15) {
      return res.status(400).json({ error: '분석할 채용공고 텍스트를 최소 15자 이상 입력해주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. Vercel 프로젝트 Settings > Environment Variables에서 GEMINI_API_KEY를 등록해주세요.',
      });
    }

    const prompt = `
[채용공고 본문]
${jobPosting}

[지원자 프로필]
- 전공: ${userProfile?.major || '미입력'}
- 학년/졸업예정: ${userProfile?.grade || '미입력'}
- 희망 직무군: ${userProfile?.targetJob || '미입력'}
- 보유 경험(동아리/인턴/프로젝트/자격증):
${userProfile?.experiences || '미입력'}
- 보유 스킬 태그: ${(userProfile?.skills || []).join(', ') || '미입력'}

위 채용공고를 모빌리티 전문 인사 컨설턴트 관점에서 정밀 분석하고, 지원자 프로필과의 적합도를 냉정하게 진단하세요.
다음 JSON 스키마 규격으로만 응답하세요.
`;

    const response = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedCompany: { type: Type.STRING, description: '추정 기업명' },
            estimatedJobTitle: { type: Type.STRING, description: '추정 직무명' },
            domainCategory: { type: Type.STRING, description: '세부 도메인' },
            summary: { type: Type.STRING, description: '직무 요약 (2-3문장)' },
            requiredKnowledge: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['title', 'reason'],
              },
            },
            requiredSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['title', 'reason'],
              },
            },
            preferredExperiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['title', 'reason'],
              },
            },
            requiredAttitudes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['title', 'reason'],
              },
            },
            topKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            matchScore: {
              type: Type.INTEGER,
            },
            scoreReason: {
              type: Type.STRING,
            },
            radarScores: {
              type: Type.OBJECT,
              properties: {
                knowledge: { type: Type.INTEGER },
                skills: { type: Type.INTEGER },
                experience: { type: Type.INTEGER },
                attitude: { type: Type.INTEGER },
              },
              required: ['knowledge', 'skills', 'experience', 'attitude'],
            },
            missingCompetencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  importance: { type: Type.STRING },
                  gapDescription: { type: Type.STRING },
                  actionItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['name', 'category', 'importance', 'gapDescription', 'actionItems'],
              },
            },
          },
          required: [
            'estimatedCompany',
            'estimatedJobTitle',
            'domainCategory',
            'summary',
            'requiredKnowledge',
            'requiredSkills',
            'preferredExperiences',
            'requiredAttitudes',
            'topKeywords',
            'matchScore',
            'scoreReason',
            'radarScores',
            'missingCompetencies',
          ],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel analyze-job error:', error?.message);
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.message || '공고 분석 중 서버 오류가 발생했습니다.',
    });
  }
}
