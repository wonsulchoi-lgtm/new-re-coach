import React from 'react';
import { UserProfile, JobAnalysisResult, InterviewPracticeRecord } from '../types';
import {
  TrendingUp,
  FileText,
  CalendarCheck,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Layers,
} from 'lucide-react';

interface DashboardTabProps {
  profile: UserProfile;
  analyses: JobAnalysisResult[];
  interviewRecords: InterviewPracticeRecord[];
  onNavigateTab: (tab: 'profile' | 'analyzer' | 'interview' | 'dashboard') => void;
  onOpenAnalysis?: (analysis: JobAnalysisResult) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  profile,
  analyses,
  interviewRecords,
  onNavigateTab,
}) => {
  // 1. Stats Calculation
  const totalAnalyses = analyses.length;

  const avgMatchScore =
    totalAnalyses > 0
      ? Math.round(analyses.reduce((acc, a) => acc + (a.matchScore || 0), 0) / totalAnalyses)
      : 0;

  // Roadmap tasks calculation
  const allRoadmapTasks = analyses.flatMap((a) => a.roadmap?.flatMap((w) => w.tasks) || []);
  const totalRoadmapTasks = allRoadmapTasks.length;
  const doneRoadmapTasks = allRoadmapTasks.filter((t) => t.done).length;
  const roadmapProgressPct =
    totalRoadmapTasks > 0 ? Math.round((doneRoadmapTasks / totalRoadmapTasks) * 100) : 0;

  // Interview stats
  const totalInterviews = interviewRecords.length;
  const avgInterviewScore =
    totalInterviews > 0
      ? Math.round(
          interviewRecords.reduce((acc, r) => acc + (r.feedback?.overallScore || 0), 0) /
            totalInterviews
        )
      : 0;

  // Average 4-dimension scores for interviews
  const avgLogic =
    totalInterviews > 0
      ? (
          interviewRecords.reduce((acc, r) => acc + (r.feedback?.scores?.logic || 0), 0) /
          totalInterviews
        ).toFixed(1)
      : '0.0';

  const avgIndustry =
    totalInterviews > 0
      ? (
          interviewRecords.reduce(
            (acc, r) => acc + (r.feedback?.scores?.industryKnowledge || 0),
            0
          ) / totalInterviews
        ).toFixed(1)
      : '0.0';

  const avgAlignment =
    totalInterviews > 0
      ? (
          interviewRecords.reduce(
            (acc, r) => acc + (r.feedback?.scores?.jobAlignment || 0),
            0
          ) / totalInterviews
        ).toFixed(1)
      : '0.0';

  const avgConcreteness =
    totalInterviews > 0
      ? (
          interviewRecords.reduce(
            (acc, r) => acc + (r.feedback?.scores?.concreteness || 0),
            0
          ) / totalInterviews
        ).toFixed(1)
      : '0.0';

  // 2. Most frequent missing competencies TOP 3
  const missingMap: { [name: string]: { count: number; category: string; action: string } } = {};
  analyses.forEach((a) => {
    (a.missingCompetencies || []).forEach((m) => {
      const key = m.name.trim();
      if (!missingMap[key]) {
        missingMap[key] = {
          count: 0,
          category: m.category || '스킬',
          action: m.actionItems?.[0] || '관련 프로젝트 및 학습 필요',
        };
      }
      missingMap[key].count += 1;
    });
  });

  const topMissing = Object.entries(missingMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  // 3. Recommended Next Actions
  const recommendations: { title: string; desc: string; actionLabel: string; tab: 'analyzer' | 'interview' | 'profile' }[] = [];

  if (totalAnalyses === 0) {
    recommendations.push({
      title: '첫 번째 모빌리티 채용공고를 분석해보세요',
      desc: '현대차, 모비스, 배터리사 등 관심 있는 공고를 붙여넣으면 내 프로필과의 적합도와 부족 역량을 즉시 확인할 수 있습니다.',
      actionLabel: '공고 분석 시작하기',
      tab: 'analyzer',
    });
  } else if (topMissing.length > 0) {
    const top = topMissing[0];
    recommendations.push({
      title: `반복 부족 역량 집중 보완: [${top[0]}]`,
      desc: `최근 분석한 공고 중 ${top[1].count}곳에서 공통으로 요구되었습니다. 추천 행동: ${top[1].action}`,
      actionLabel: '4주 로드맵 확인하기',
      tab: 'analyzer',
    });
  }

  if (totalInterviews === 0) {
    recommendations.push({
      title: '실전 모빌리티 산업 이슈 면접 연습',
      desc: 'SDV, 전기차 캐즘, 배터리 규제 등 면접관 단골 이슈를 내 직무 관점으로 시뮬레이션하고 AI 피드백을 받아보세요.',
      actionLabel: '면접 연습 시작하기',
      tab: 'interview',
    });
  } else if (parseFloat(avgIndustry) < 3.5) {
    recommendations.push({
      title: '모빌리티 산업 이해도 보강 추천',
      desc: `면접 점수 중 산업 이해도 평균이 ${avgIndustry}점입니다. 이슈 브리프의 3줄 요약(배경-현황-시사점)을 복습해보세요.`,
      actionLabel: '이슈 브리프 보러가기',
      tab: 'interview',
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              모빌리티 취업 준비 종합 관제탑
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-blue-400">
              {profile.major ? `${profile.major} 취준생 님` : '모빌리티 준비생 님'}, 준비 현황 대시보드
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              분석한 공고들의 갭 데이터와 면접 연습 점수를 누적 분석하여, 합격까지 가장 빠르게 도달할 수 있는 액션을 제안합니다.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateTab('analyzer')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            >
              <span className="text-white font-bold">+ 새 공고 분석</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('interview')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <span>실전 면접 연습</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 분석 공고 수 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">분석한 채용공고</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-slate-900">{totalAnalyses}</span>
              <span className="text-xs text-slate-400 font-semibold">건</span>
            </div>
            <span className="text-[11px] text-teal-700 font-medium mt-1 block">
              {totalAnalyses > 0 ? '역량 갭 분석 완료' : '공고를 등록해주세요'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: 평균 적합도 점수 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">평균 직무 적합도</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-slate-900">{avgMatchScore}</span>
              <span className="text-xs text-slate-400 font-semibold">/ 100점</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              {totalAnalyses > 0 ? `공고 ${totalAnalyses}건 종합 평균` : '공고 분석 시 산출'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: 4주 로드맵 진행률 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">로드맵 과제 달성률</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-slate-900">{roadmapProgressPct}%</span>
              <span className="text-xs text-slate-400 font-semibold">
                ({doneRoadmapTasks}/{totalRoadmapTasks})
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              {totalRoadmapTasks > 0 ? '체크리스트 실천 중' : '공고에서 로드맵 생성 필요'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: 면접 연습 횟수 & 평균 점수 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">면접 연습 누적</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-slate-900">{totalInterviews}</span>
              <span className="text-xs text-slate-400 font-semibold">회</span>
              {totalInterviews > 0 && (
                <span className="text-xs text-teal-600 font-bold ml-1">
                  (평균 {avgInterviewScore}점)
                </span>
              )}
            </div>
            <span className="text-[11px] text-purple-700 font-medium mt-1 block">
              {totalInterviews > 0 ? '산업 이슈 Q&A 완료' : '면접 연습을 시작해보세요'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Middle Section: Top 3 Missing Competencies & Interview Evaluation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Top 3 Missing Competencies (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-500" />
                가장 자주 부족하다고 나온 역량 TOP 3
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                내가 분석한 여러 공고에서 공통적으로 요구하지만 내 프로필에 취약한 항목들입니다.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
              공고 누적 집계
            </span>
          </div>

          {topMissing.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">아직 분석된 공고 데이터가 충분하지 않습니다.</p>
              <p className="text-[11px] text-slate-400 mt-1">공고를 1개 이상 분석하면 부족 역량이 자동으로 집계됩니다.</p>
              <button
                onClick={() => onNavigateTab('analyzer')}
                className="mt-3 text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
              >
                첫 공고 분석하러 가기 &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topMissing.map(([name, info], idx) => (
                <div
                  key={name}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                        {info.category}
                      </span>
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                        {info.count}개 공고에서 요구
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      💡 권장 액션: <span className="font-medium text-slate-800">{info.action}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Interview 4-Dimension Average Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              면접 역량 4대 평가 평균
            </h3>
            <span className="text-xs text-slate-400">각 5.0 만점</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* 논리성 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">논리성 (두괄식/구성)</span>
                <span className="font-bold text-slate-900">{avgLogic} / 5.0</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-2 rounded-full"
                  style={{ width: `${(parseFloat(avgLogic) / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 산업 이해도 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">산업 이해도 (최신 트렌드)</span>
                <span className="font-bold text-slate-900">{avgIndustry} / 5.0</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(parseFloat(avgIndustry) / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 직무 연결성 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">직무 연결성 (역할 관점)</span>
                <span className="font-bold text-slate-900">{avgAlignment} / 5.0</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(parseFloat(avgAlignment) / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 구체성 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">구체성 (키워드/기술)</span>
                <span className="font-bold text-slate-900">{avgConcreteness} / 5.0</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${(parseFloat(avgConcreteness) / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab('interview')}
              className="w-full py-2.5 rounded-xl border border-slate-300 hover:border-teal-500 hover:bg-teal-50/50 text-xs font-bold text-slate-700 hover:text-teal-800 transition flex items-center justify-center gap-1.5"
            >
              <span>모의면접 이어서 연습하기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations & Next Steps Section */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-base">
            다음에 할 일 추천 (AI 커리어 코칭)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-teal-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  추천 ACTION #{idx + 1}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">{rec.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab(rec.tab)}
                className="self-start px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>{rec.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
