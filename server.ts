import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '5mb' }));

// Initialize GoogleGenAI client (Server-side only)
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Primary fast model ('gemini-3.1-flash-lite' has sub-second latency and minimal queueing)
const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

const SYSTEM_INSTRUCTION_CONSULTANT = `
당신은 대한민국 최고 수준의 모빌리티 산업(현대자동차그룹, 완성차, 1차 티어1 부품사, 배터리 3사, 자율주행·SDV 스타트업 등) 인사담당자 및 기술면접관 출신의 전문 취업 컨설턴트입니다.

[원칙]
1. 모빌리티 산업 맥락을 깊이 이해하고 조언합니다 (SDV, CAN/Ethernet 통신, BMS, LFP/삼원계, 모터/인버터 제어, ISO 26262 기능안전, 기구/샤시/생산기술 등).
2. 사실이 불확실한 특정 기업의 내부 정보나 임의 수치는 단정하지 말고 "공고에 근거한 합리적 해석"임을 밝히세요.
3. 점수는 반드시 정량 평가와 함께 '근거 문장 1줄'을 구체적으로 제시해야 합니다.
4. 피드백 톤: 모빌리티 업계 준비생에게 구체적이고 실질적이면서도 따뜻하지만 날카롭게 진단합니다. 막연한 칭찬은 지양하고, 실제 실무진 면접관이 검증할 포인트를 짚어줍니다.
5. 출력은 반드시 지정된 유효한 JSON 형식이어야 합니다.
`;

// Helper for cleaning JSON response text
function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// Resilient generateContent caller with timeout and fallback
async function callGeminiWithTimeout(params: any, timeoutMs = 25000): Promise<any> {
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
    console.warn(`Primary model ${PRIMARY_MODEL} failed, trying fallback:`, err.message);
    try {
      return await tryCall(FALLBACK_MODEL);
    } catch (fallbackErr: any) {
      console.error('All Gemini attempts failed:', fallbackErr);
      throw fallbackErr;
    }
  }
}

// 1. Job Posting Analyzer Endpoint
app.post('/api/analyze-job', async (req, res) => {
  try {
    const { jobPosting, userProfile } = req.body;
    if (!jobPosting || typeof jobPosting !== 'string' || jobPosting.trim().length < 15) {
      return res.status(400).json({ error: '분석할 채용공고 텍스트를 최소 15자 이상 입력해주세요.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. AI Studio Secrets 패널에서 키를 확인해주세요.',
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

    const response: any = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedCompany: { type: Type.STRING, description: '추정 기업명 (공고에 명시된 기업 또는 성격 기반 추정)' },
            estimatedJobTitle: { type: Type.STRING, description: '추정 직무명' },
            domainCategory: { type: Type.STRING, description: '세부 도메인 (예: 완성차 R&D, 전장·SDV, 배터리 셀·소재, 생산기술, 품질관리 등)' },
            summary: { type: Type.STRING, description: '이 공고의 직무 역할 및 비즈니스 목적 핵심 요약 (2-3문장)' },
            requiredKnowledge: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING, description: '실무에서 필요한 이유' },
                },
                required: ['title', 'reason'],
              },
              description: '요구 지식 목록 (3~5개)',
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
              description: '요구 하드/소프트 스킬 목록 (3~5개)',
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
              description: '우대 경험 목록 (2~4개)',
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
              description: '요구 인성·협업 태도 목록 (2~3개)',
            },
            topKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '이 직무의 핵심 키워드 정확히 5개',
            },
            matchScore: {
              type: Type.INTEGER,
              description: '지원자 프로필과 비교한 종합 적합도 점수 (0-100 정수)',
            },
            scoreReason: {
              type: Type.STRING,
              description: '종합 적합도 점수 산출 근거 1줄 설명',
            },
            radarScores: {
              type: Type.OBJECT,
              properties: {
                knowledge: { type: Type.INTEGER, description: '지식 적합도 (0-100)' },
                skills: { type: Type.INTEGER, description: '스킬 적합도 (0-100)' },
                experience: { type: Type.INTEGER, description: '경험 적합도 (0-100)' },
                attitude: { type: Type.INTEGER, description: '태도 적합도 (0-100)' },
              },
              required: ['knowledge', 'skills', 'experience', 'attitude'],
            },
            missingCompetencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: '부족 역량명' },
                  category: { type: Type.STRING, description: '지식, 스킬, 경험, 태도 중 하나' },
                  importance: { type: Type.STRING, description: '필수, 우대, 권장 중 하나' },
                  gapDescription: { type: Type.STRING, description: '현재 프로필 대비 어떤 점이 부족한지 명확한 진단' },
                  actionItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '모빌리티 실무 대비 구체적 보완 행동 1~2개',
                  },
                },
                required: ['name', 'category', 'importance', 'gapDescription', 'actionItems'],
              },
              description: '부족 역량 목록 (3~5개)',
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
    res.json(parsed);
  } catch (error: any) {
    console.error('Job analysis error:', error);
    res.status(500).json({
      error: error?.message || '공고 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// 2. 4-Week Roadmap Generator Endpoint
app.post('/api/generate-roadmap', async (req, res) => {
  try {
    const { jobAnalysis, userProfile } = req.body;
    if (!jobAnalysis) {
      return res.status(400).json({ error: '공고 분석 결과가 필요합니다.' });
    }

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

    const response: any = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              week: { type: Type.INTEGER, description: '1, 2, 3, 4' },
              theme: { type: Type.STRING, description: '주차별 핵심 테마 (예: 1주차 - 전장 통신 아키텍처 이론 및 CAN 패킷 분석 기초)' },
              description: { type: Type.STRING, description: '해당 주차 집중 목표 설명' },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING, description: '구체적인 할 일 항목' },
                    deliverableTip: { type: Type.STRING, description: '면접/이력서에 어필할 산출물 팁' },
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

    res.json(formatted);
  } catch (error: any) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({
      error: error?.message || '로드맵 생성 중 오류가 발생했습니다.',
    });
  }
});

// 3. Issue Brief & Interview Questions Endpoint
app.post('/api/issue-brief', async (req, res) => {
  try {
    const { issueTopic, targetJob, major } = req.body;
    if (!issueTopic || typeof issueTopic !== 'string') {
      return res.status(400).json({ error: '이슈 주제를 전달해주세요.' });
    }

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

    const response: any = await callGeminiWithTimeout({
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
                background: { type: Type.STRING, description: '배경: 왜 이 이슈가 촉발되었는가 (1문장)' },
                currentStatus: { type: Type.STRING, description: '현황: 현재 글로벌/국내 완성차 및 업계의 전개 상황 (1문장)' },
                implication: { type: Type.STRING, description: '시사점: 모빌리티 기업의 향후 방향 및 구직자가 주목할 관점 (1문장)' },
              },
              required: ['background', 'currentStatus', 'implication'],
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING, description: '실제 면접 질문 문장' },
                  intent: { type: Type.STRING, description: '면접관의 평가 의도' },
                  mobilityRelevance: { type: Type.STRING, description: '희망 직무와 어떻게 결합되는지 팁' },
                },
                required: ['id', 'question', 'intent', 'mobilityRelevance'],
              },
              description: '정확히 3개의 질문',
            },
          },
          required: ['issueTopic', 'summary', 'questions'],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    res.json(parsed);
  } catch (error: any) {
    console.error('Issue brief error:', error);
    res.status(500).json({
      error: error?.message || '이슈 브리프 생성 중 오류가 발생했습니다.',
    });
  }
});

// 4. Interview Answer Evaluation Endpoint
app.post('/api/interview-feedback', async (req, res) => {
  try {
    const { issueTopic, question, userAnswer, userProfile } = req.body;
    if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length < 5) {
      return res.status(400).json({ error: '답변을 최소 5자 이상 작성해주세요.' });
    }

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
- 구체성 (1~5점): 추상적인 구호("최선을 다하겠다")가 아닌 구체적인 사례, 기술 키워드, 해결 방안 제시

추가 요구:
- 각 점수마다 1줄 평가 근거 제시
- 잘한 점 2개 (구체적으로 칭찬)
- 보완할 점 2개 (직접 실천 가능한 개선 팁)
- 모범 개선 답변 예시 (3~4문장으로 바로 면접장에서 쓸 수 있는 수준의 답변)
- 면접관의 예리한 꼬리질문 1개 (지원자가 이어서 답변할 수 있도록)

반드시 아래 JSON 스키마로 응답하세요.
`;

    const response: any = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: '종합 점수 (0-100점 환산)' },
            scores: {
              type: Type.OBJECT,
              properties: {
                logic: { type: Type.INTEGER, description: '논리성 (1~5점)' },
                industryKnowledge: { type: Type.INTEGER, description: '산업 이해도 (1~5점)' },
                jobAlignment: { type: Type.INTEGER, description: '직무 연결성 (1~5점)' },
                concreteness: { type: Type.INTEGER, description: '구체성 (1~5점)' },
              },
              required: ['logic', 'industryKnowledge', 'jobAlignment', 'concreteness'],
            },
            scoreRationales: {
              type: Type.OBJECT,
              properties: {
                logic: { type: Type.STRING, description: '논리성 점수 근거 1줄' },
                industryKnowledge: { type: Type.STRING, description: '산업 이해도 점수 근거 1줄' },
                jobAlignment: { type: Type.STRING, description: '직무 연결성 점수 근거 1줄' },
                concreteness: { type: Type.STRING, description: '구체성 점수 근거 1줄' },
              },
              required: ['logic', 'industryKnowledge', 'jobAlignment', 'concreteness'],
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '잘한 점 정확히 2개',
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '보완할 점 정확히 2개',
            },
            improvedAnswerExample: {
              type: Type.STRING,
              description: '모범 개선 답변 예시 (3~4문장)',
            },
            followUpQuestion: {
              type: Type.STRING,
              description: '예리한 꼬리 질문 1개',
            },
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
    res.json(parsed);
  } catch (error: any) {
    console.error('Interview feedback error:', error);
    res.status(500).json({
      error: error?.message || '면접 피드백 생성 중 오류가 발생했습니다.',
    });
  }
});

// 5. Follow-up Answer Evaluation
app.post('/api/interview-followup', async (req, res) => {
  try {
    const { originalQuestion, originalAnswer, followUpQuestion, followUpAnswer, userProfile } = req.body;
    if (!followUpAnswer || typeof followUpAnswer !== 'string') {
      return res.status(400).json({ error: '꼬리질문 답변을 입력해주세요.' });
    }

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

    const response: any = await callGeminiWithTimeout({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CONSULTANT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedbackText: { type: Type.STRING, description: '꼬리질문 대처에 대한 실무 피드백 (2~3문장)' },
            scoreChange: { type: Type.STRING, description: '꼬리질문 방어 평가 (예: 우수한 위기 대처 / 다소 아쉬운 근거 부족 등)' },
          },
          required: ['feedbackText', 'scoreChange'],
        },
      },
    });

    const text = response?.text || '{}';
    const parsed = JSON.parse(cleanJsonText(text));
    res.json(parsed);
  } catch (error: any) {
    console.error('Follow-up error:', error);
    res.status(500).json({
      error: error?.message || '꼬리질문 피드백 생성 중 오류가 발생했습니다.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: isProduction ? 'production' : 'development',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mobility Career Coach Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
