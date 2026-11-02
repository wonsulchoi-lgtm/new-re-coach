import React, { useState } from 'react';
import { UserProfile, JobAnalysisResult, RoadmapWeek } from '../types';
import { RadarChart } from './RadarChart';
import { SAMPLE_JOB_POSTINGS } from '../utils/sampleData';
import { apiFetch } from '../utils/apiClient';
import {
  Search,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  Cpu,
  HeartHandshake,
  Layers,
  ArrowRight,
  FolderOpen,
  Target,
} from 'lucide-react';

interface JobAnalyzerTabProps {
  profile: UserProfile;
  analyses: JobAnalysisResult[];
  onSaveAnalysis: (result: JobAnalysisResult) => void;
  onUpdateAnalysis: (result: JobAnalysisResult) => void;
  onDeleteAnalysis: (id: string) => void;
  onNavigateToInterviewWithTopic?: (topic: string) => void;
}

export const JobAnalyzerTab: React.FC<JobAnalyzerTabProps> = ({
  profile,
  analyses,
  onSaveAnalysis,
  onUpdateAnalysis,
  onDeleteAnalysis,
  onNavigateToInterviewWithTopic,
}) => {
  const [jobText, setJobText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<JobAnalysisResult | null>(
    analyses.length > 0 ? analyses[0] : null
  );
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const resultRef = React.useRef<HTMLDivElement>(null);

  // Quick load sample job
  const handleSelectSample = (sample: (typeof SAMPLE_JOB_POSTINGS)[0]) => {
    setJobText(sample.content);
    setErrorMsg(null);
  };

  // Run AI Analysis
  const handleAnalyze = async () => {
    if (!jobText.trim() || jobText.trim().length < 15) {
      setErrorMsg('채용공고 텍스트를 최소 15자 이상 입력해주세요.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setAnalyzingStep('1단계: 채용공고 텍스트 구조화 및 핵심 키워드 추출 중...');

    const stepTimer1 = setTimeout(() => {
      setAnalyzingStep('2단계: 모빌리티 직무 요구역량(지식/스킬/경험/태도) 정밀 분해 중...');
    }, 1800);

    const stepTimer2 = setTimeout(() => {
      setAnalyzingStep('3단계: 지원자 프로필과 1:1 역량 대조 및 레이더 차트 적합도 계산 중...');
    }, 3800);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const result = await apiFetch<any>('/api/analyze-job', {
        method: 'POST',
        body: {
          jobPosting: jobText,
          userProfile: profile,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const analysisWithMeta: JobAnalysisResult = {
        ...result,
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        rawJobPosting: jobText,
      };

      setCurrentAnalysis(analysisWithMeta);
      onSaveAnalysis(analysisWithMeta);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: any) {
      console.error('Job analysis error:', err);
      setErrorMsg(err.message || '공고 분석 중 오류가 발생했습니다.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(timeoutId);
      setAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  // Generate 4-week roadmap
  const handleGenerateRoadmap = async () => {
    if (!currentAnalysis) return;
    setGeneratingRoadmap(true);
    setRoadmapError(null);

    try {
      const roadmap = await apiFetch<RoadmapWeek[]>('/api/generate-roadmap', {
        method: 'POST',
        body: {
          jobAnalysis: currentAnalysis,
          userProfile: profile,
        },
      });

      const updated = {
        ...currentAnalysis,
        roadmap,
      };
      setCurrentAnalysis(updated);
      onUpdateAnalysis(updated);
    } catch (err: any) {
      console.error('Roadmap generation error:', err);
      setRoadmapError(err.message || '로드맵 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  // Toggle checklist task
  const handleToggleTask = (weekNumber: number, taskId: string) => {
    if (!currentAnalysis || !currentAnalysis.roadmap) return;

    const updatedRoadmap = currentAnalysis.roadmap.map((w) => {
      if (w.week !== weekNumber) return w;
      return {
        ...w,
        tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      };
    });

    const updated = {
      ...currentAnalysis,
      roadmap: updatedRoadmap,
    };
    setCurrentAnalysis(updated);
    onUpdateAnalysis(updated);
  };

  // Roadmap completion stats
  const totalTasks = currentAnalysis?.roadmap?.flatMap((w) => w.tasks).length || 0;
  const doneTasks = currentAnalysis?.roadmap?.flatMap((w) => w.tasks).filter((t) => t.done).length || 0;
  const roadmapPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              모빌리티 특화 채용공고 AI 분석기
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              채용공고 본문을 입력하세요
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              완성차, 부품사, 배터리, 자율주행 등 채용공고 텍스트를 그대로 붙여넣으면 요구 역량을 해체하고 내 프로필과 비교해드립니다.
            </p>
          </div>

          {/* History drawer button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4 text-slate-500" />
              분석 기록 ({analyses.length})
            </button>
          </div>
        </div>

        {/* History drawer list */}
        {historyOpen && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">저장된 공고 분석 기록 (최근 최대 20개)</span>
              <span className="text-xs text-slate-400">클릭하면 해당 결과를 즉시 불러옵니다</span>
            </div>
            {analyses.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">아직 저장된 분석 기록이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {analyses.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-start justify-between gap-2 ${
                      currentAnalysis?.id === item.id
                        ? 'bg-teal-50/70 border-teal-400 ring-1 ring-teal-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => {
                      setCurrentAnalysis(item);
                      setJobText(item.rawJobPosting || '');
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.estimatedCompany || '모빌리티 기업'}
                      </p>
                      <p className="text-xs text-slate-600 truncate">{item.estimatedJobTitle}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded">
                          적합도 {item.matchScore}점
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnalysis(item.id);
                        if (currentAnalysis?.id === item.id) {
                          setCurrentAnalysis(analyses.filter((a) => a.id !== item.id)[0] || null);
                        }
                      }}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="기록 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sample job chips */}
        <div>
          <span className="text-xs font-semibold text-slate-500 block mb-2">
            원클릭 실제 공고 예시 불러오기:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_JOB_POSTINGS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/40 transition font-medium text-left"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div>
          <textarea
            rows={8}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="사람인, 원티드, 현대차그룹 채용 홈페이지, 잡코리아 등의 [담당업무 / 지원자격 / 우대사항] 공고 텍스트를 그대로 복사하여 붙여넣으세요..."
            className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm leading-relaxed font-sans placeholder-slate-400 bg-slate-50/30"
          />
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">분석 진행 중 오류가 발생했습니다</p>
              <p className="text-xs mt-0.5 text-rose-700">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Analyze Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              현재 적용 프로필: <span className="font-semibold text-slate-800">{profile.major || '전공 미설정'} ({profile.targetJob || '직무 미설정'})</span>
            </div>
            {analyzing && analyzingStep && (
              <span className="text-[11px] text-teal-700 font-medium animate-pulse">
                ⏳ {analyzingStep}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={analyzing}
            onClick={handleAnalyze}
            className={`px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition ${
              analyzing
                ? 'bg-teal-700 cursor-not-allowed shadow-inner'
                : 'bg-slate-900 hover:bg-teal-600 active:scale-95'
            }`}
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>정밀 분석 진행 중...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-teal-400" />
                <span>공고 분석하기</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {currentAnalysis && (
        <div ref={resultRef} className="space-y-8 animate-fade-in scroll-mt-20">
          {/* Header Card: Company & Match Score */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {currentAnalysis.domainCategory || '모빌리티'}
                  </span>
                  <span className="text-xs text-slate-400">
                    분석일시: {new Date(currentAnalysis.createdAt).toLocaleString()}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  <span className="text-teal-400">{currentAnalysis.estimatedCompany}</span> {currentAnalysis.estimatedJobTitle}
                </h1>
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                  {currentAnalysis.summary}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {currentAnalysis.topKeywords?.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Match Score Badge */}
              <div className="shrink-0 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center min-w-[200px] text-center shadow-inner">
                <span className="text-xs text-slate-400 font-medium">내 프로필 적합도</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-5xl font-black text-teal-300 tracking-tight">
                    {currentAnalysis.matchScore}
                  </span>
                  <span className="text-slate-400 text-sm font-semibold">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-2 px-2 py-1 bg-slate-900/60 rounded-md border border-slate-700/50">
                  {currentAnalysis.scoreReason}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Radar Chart + 4 Job Requirements Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Radar Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  항목별 적합도 진단
                </h3>
                <span className="text-xs text-slate-400">4대 축 레이더 차트</span>
              </div>
              <RadarChart scores={currentAnalysis.radarScores} size={300} />

              <div className="w-full grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500">요구 지식</div>
                  <div className="text-lg font-bold text-slate-900">{currentAnalysis.radarScores.knowledge}점</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500">직무 스킬</div>
                  <div className="text-lg font-bold text-slate-900">{currentAnalysis.radarScores.skills}점</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500">프로젝트·경험</div>
                  <div className="text-lg font-bold text-slate-900">{currentAnalysis.radarScores.experience}점</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-slate-500">인성·협업 태도</div>
                  <div className="text-lg font-bold text-slate-900">{currentAnalysis.radarScores.attitude}점</div>
                </div>
              </div>
            </div>

            {/* Right: Requirements Decomposition (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  공고 요구사항 정밀 추출
                </h3>

                {/* 1. 요구 지식 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    요구 지식 (Knowledge)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentAnalysis.requiredKnowledge?.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
                        <span className="font-bold text-blue-900 block">{item.title}</span>
                        <span className="text-blue-700/80 text-[11px] mt-0.5 block">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 요구 스킬 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                    <Cpu className="w-3.5 h-3.5 text-teal-600" />
                    요구 스킬 및 툴 (Skills)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentAnalysis.requiredSkills?.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 text-xs">
                        <span className="font-bold text-teal-900 block">{item.title}</span>
                        <span className="text-teal-700/80 text-[11px] mt-0.5 block">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. 우대 경험 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    우대 경험 (Experiences)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentAnalysis.preferredExperiences?.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                        <span className="font-bold text-amber-900 block">{item.title}</span>
                        <span className="text-amber-700/80 text-[11px] mt-0.5 block">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. 인성 / 태도 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                    <HeartHandshake className="w-3.5 h-3.5 text-violet-600" />
                    인성 및 협업 태도 (Attitude)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentAnalysis.requiredAttitudes?.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-violet-50/50 border border-violet-100 text-xs">
                        <span className="font-bold text-violet-900 block">{item.title}</span>
                        <span className="text-violet-700/80 text-[11px] mt-0.5 block">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: 부족 역량 및 보완 가이드 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 text-xs font-bold mb-2">
                  <Target className="w-3.5 h-3.5" />
                  합격을 가르는 역량 갭 (Gap)
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  부족한 역량 진단 및 1:1 보완 가이드
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  내 프로필과 공고를 비교하여 감점 요인이 될 수 있는 항목과 면접관을 사로잡을 실천 솔루션입니다.
                </p>
              </div>

              {/* Button: Generate 4-Week Roadmap */}
              <button
                type="button"
                disabled={generatingRoadmap}
                onClick={handleGenerateRoadmap}
                className={`px-5 py-3 rounded-xl text-xs md:text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition shrink-0 ${
                  generatingRoadmap
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 active:scale-95'
                }`}
              >
                {generatingRoadmap ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>4주 로드맵 설계 중...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>4주 보완 로드맵 만들기</span>
                  </>
                )}
              </button>
            </div>

            {roadmapError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200">
                {roadmapError}
              </div>
            )}

            {/* Missing competencies cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentAnalysis.missingCompetencies?.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {gap.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-700">
                        {gap.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          gap.importance === '필수'
                            ? 'bg-rose-100 text-rose-700'
                            : gap.importance === '우대'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {gap.importance}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    {gap.gapDescription}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-teal-800 block">
                      💡 추천 보완 행동:
                    </span>
                    {gap.actionItems?.map((act, aIdx) => (
                      <div
                        key={aIdx}
                        className="text-xs text-slate-700 flex items-start gap-2 bg-teal-50/60 p-2 rounded-lg border border-teal-100/60"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: 4-Week Roadmap Checklist (if generated) */}
          {currentAnalysis.roadmap && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-100 text-teal-800 text-xs font-bold mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    실전 4주 보완 로드맵
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    주차별 합격 완성 체크리스트
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    각 과제를 실천하고 체크하세요. 진행 상태는 자동으로 저장됩니다.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[220px]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">로드맵 달성률</span>
                    <span className="font-bold text-teal-700">
                      {doneTasks} / {totalTasks} ({roadmapPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${roadmapPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentAnalysis.roadmap.map((week) => (
                  <div
                    key={week.week}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-teal-300">
                          {week.week}주차
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {week.tasks.filter((t) => t.done).length}/{week.tasks.length} 완료
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {week.theme}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        {week.description}
                      </p>

                      <div className="space-y-2 mt-4">
                        {week.tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(week.week, task.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition select-none flex items-start gap-2 ${
                              task.done
                                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                                : 'bg-white border-slate-200 hover:border-teal-400 text-slate-800'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {task.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium ${task.done ? 'line-through text-slate-400' : ''}`}>
                                {task.text}
                              </p>
                              {task.deliverableTip && (
                                <p className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded mt-1 font-medium inline-block">
                                  📌 산출물: {task.deliverableTip}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick link to interview practice */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                이 공고와 관련된 산업 이슈로 면접을 연습해보시겠어요?
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                추정 직무({currentAnalysis.estimatedJobTitle})에 최적화된 모빌리티 이슈 질문을 바로 생성할 수 있습니다.
              </p>
            </div>
            {onNavigateToInterviewWithTopic && (
              <button
                type="button"
                onClick={() => onNavigateToInterviewWithTopic(currentAnalysis.domainCategory || currentAnalysis.estimatedJobTitle)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <span>이슈 면접 연습하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
