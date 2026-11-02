import React, { useState } from 'react';
import { UserProfile, IssueBrief, InterviewPracticeRecord, InterviewFeedbackResult } from '../types';
import { MOBILITY_ISSUES } from '../utils/sampleData';
import { apiFetch } from '../utils/apiClient';
import {
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  History,
  Trash2,
  Flame,
  ThumbsUp,
  RotateCcw,
} from 'lucide-react';

interface InterviewPracticeTabProps {
  profile: UserProfile;
  practiceRecords: InterviewPracticeRecord[];
  onSavePractice: (record: InterviewPracticeRecord) => void;
  onUpdatePractice: (record: InterviewPracticeRecord) => void;
  onDeletePractice: (id: string) => void;
  initialTopic?: string;
}

export const InterviewPracticeTab: React.FC<InterviewPracticeTabProps> = ({
  profile,
  practiceRecords,
  onSavePractice,
  onUpdatePractice,
  onDeletePractice,
  initialTopic,
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState<string>(
    initialTopic ? 'custom' : MOBILITY_ISSUES[0].id
  );
  const [customTopic, setCustomTopic] = useState(initialTopic || '');
  const [isCustomMode, setIsCustomMode] = useState(!!initialTopic);

  // Issue brief state
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [currentBrief, setCurrentBrief] = useState<IssueBrief | null>(null);

  // Selected question & answer
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<InterviewFeedbackResult | null>(null);

  // Follow-up state
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [evaluatingFollowUp, setEvaluatingFollowUp] = useState(false);
  const [followUpResult, setFollowUpResult] = useState<{ feedbackText: string; scoreChange: string } | null>(null);

  // History tab toggle
  const [showHistory, setShowHistory] = useState(false);

  // Load Issue Brief & 3 tailored questions
  const handleLoadIssue = async (topicTitle: string) => {
    setLoadingBrief(true);
    setBriefError(null);
    setSelectedQuestion(null);
    setCurrentFeedback(null);
    setFollowUpResult(null);
    setUserAnswer('');
    setFollowUpAnswer('');

    try {
      const result = await apiFetch<IssueBrief>('/api/issue-brief', {
        method: 'POST',
        body: {
          issueTopic: topicTitle,
          targetJob: profile.targetJob || '모빌리티 엔지니어링',
          major: profile.major || '공학',
        },
      });

      setCurrentBrief(result);
      if (result.questions && result.questions.length > 0) {
        setSelectedQuestion(result.questions[0].question);
      }
    } catch (err: any) {
      console.error('Issue brief error:', err);
      setBriefError(err.message || '이슈 브리프를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingBrief(false);
    }
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!selectedQuestion) {
      setEvalError('면접 질문을 먼저 선택해주세요.');
      return;
    }
    if (!userAnswer.trim() || userAnswer.trim().length < 10) {
      setEvalError('실제 면접이라 생각하고 답변을 최소 10자 이상 성실히 작성해주세요.');
      return;
    }

    setEvaluating(true);
    setEvalError(null);
    setFollowUpResult(null);

    const topicTitle = isCustomMode
      ? customTopic
      : MOBILITY_ISSUES.find((i) => i.id === selectedIssueId)?.fullTopic || '모빌리티 산업 이슈';

    try {
      const feedback = await apiFetch<InterviewFeedbackResult>('/api/interview-feedback', {
        method: 'POST',
        body: {
          issueTopic: topicTitle,
          question: selectedQuestion,
          userAnswer,
          userProfile: profile,
        },
      });

      setCurrentFeedback(feedback);

      // Save to practice records
      const newRecord: InterviewPracticeRecord = {
        id: `practice-${Date.now()}`,
        createdAt: new Date().toISOString(),
        issueTopic: topicTitle,
        question: selectedQuestion,
        userAnswer,
        targetJobSnapshot: profile.targetJob,
        feedback,
      };
      onSavePractice(newRecord);
    } catch (err: any) {
      console.error('Interview evaluation error:', err);
      setEvalError(err.message || '답변 평가 중 오류가 발생했습니다.');
    } finally {
      setEvaluating(false);
    }
  };

  // Submit Follow-up Question Answer
  const handleSubmitFollowUp = async () => {
    if (!currentFeedback?.followUpQuestion || !followUpAnswer.trim()) return;

    setEvaluatingFollowUp(true);
    try {
      const res = await apiFetch<any>('/api/interview-followup', {
        method: 'POST',
        body: {
          originalQuestion: selectedQuestion,
          originalAnswer: userAnswer,
          followUpQuestion: currentFeedback.followUpQuestion,
          followUpAnswer,
          userProfile: profile,
        },
      });
      setFollowUpResult(res);

      // Update in storage if there's a recent record
      if (practiceRecords.length > 0) {
        const latest = practiceRecords[0];
        const updated = {
          ...latest,
          followUpAnswer,
          followUpFeedback: res,
        };
        onUpdatePractice(updated);
      }
    } catch (err: any) {
      console.error(err);
      alert('꼬리질문 피드백 생성 중 오류: ' + (err.message || '오류 발생'));
    } finally {
      setEvaluatingFollowUp(false);
    }
  };

  // Helper for score stars/bars
  const renderScoreBar = (score: number, max = 5) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-2 rounded-sm ${
              i < score ? 'bg-teal-500' : 'bg-slate-200'
            }`}
          />
        ))}
        <span className="text-xs font-bold text-slate-800 ml-1.5">{score}/5</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              모빌리티 최신 이슈 기반 실전 모의면접
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              산업 이슈 브리프 &amp; AI 면접관 피드백
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1">
              SDV, 전기차 캐즘, 배터리 화재/규제 등 실무 면접 단골 주제를 내 희망 직무({profile.targetJob || '모빌리티'}) 관점으로 시뮬레이션합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <History className="w-4 h-4 text-teal-400" />
            연습 기록 ({practiceRecords.length})
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              과거 면접 연습 기록 및 점수
            </h3>
            <span className="text-xs text-slate-400">최근 {practiceRecords.length}회 연습</span>
          </div>

          {practiceRecords.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">아직 저장된 면접 연습 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {practiceRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">
                        종합 {rec.feedback.overallScore}점
                      </span>
                      <span className="text-slate-500 font-medium truncate">{rec.issueTopic}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-xs">Q. {rec.question}</p>
                    <p className="text-slate-500 truncate text-[11px]">내 답변: {rec.userAnswer}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeletePractice(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. Issue Chips Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            모빌리티 핵심 산업 이슈 선택
          </label>
          <span className="text-xs text-slate-500">원하는 주제를 클릭하여 브리프를 생성하세요</span>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2.5">
          {MOBILITY_ISSUES.map((issue) => {
            const isSelected = !isCustomMode && selectedIssueId === issue.id;
            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedIssueId(issue.id);
                  handleLoadIssue(issue.fullTopic);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-teal-300 border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                }`}
              >
                <span>{issue.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-teal-400/20 text-teal-200' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {issue.badge}
                </span>
              </button>
            );
          })}

          {/* Custom Input Chip */}
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
              setSelectedIssueId('custom');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
              isCustomMode
                ? 'bg-slate-900 text-teal-300 border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400'
            }`}
          >
            ✏️ 직접 입력
          </button>
        </div>

        {/* Custom Input Field */}
        {isCustomMode && (
          <div className="flex gap-2 pt-2 animate-fade-in">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="예: 현대차 E-GMP 플랫폼 경쟁력, 도심항공교통(UAM) 실증 사업, 테슬라 FSD V12 국내 도입 등"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              disabled={!customTopic.trim() || loadingBrief}
              onClick={() => handleLoadIssue(customTopic)}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:bg-slate-300"
            >
              이슈 분석 &amp; 질문 생성
            </button>
          </div>
        )}
      </div>

      {/* Loading brief state */}
      {loadingBrief && (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold text-slate-800 text-sm">모빌리티 산업 이슈 브리프 및 맞춤 면접 질문 추출 중...</p>
          <p className="text-xs text-slate-400">지원자의 희망 직무({profile.targetJob || '엔지니어링'}) 관점을 반영한 질문을 구성하고 있습니다.</p>
        </div>
      )}

      {briefError && (
        <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-sm border border-rose-200">
          {briefError}
        </div>
      )}

      {/* 2. Issue 3-Line Summary & Questions */}
      {currentBrief && !loadingBrief && (
        <div className="space-y-6 animate-fade-in">
          {/* 3-Line Summary Card */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                이슈 핵심 3줄 브리프
              </h3>
              <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-semibold border border-teal-100">
                면접 답변 배경 지식
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider mb-1">
                  [배경] 이슈 촉발 원인
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {currentBrief.summary?.background}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider mb-1">
                  [현황] 완성차/업계 동향
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {currentBrief.summary?.currentStatus}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider mb-1">
                  [시사점] 취준생 주목 포인트
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {currentBrief.summary?.implication}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Questions Selection */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                직무 맞춤 실전 면접 질문 3선
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                연습하고자 하는 질문을 하나 선택한 후, 아래 입력창에 실전처럼 답변을 작성해보세요.
              </p>
            </div>

            <div className="space-y-3">
              {currentBrief.questions?.map((q, idx) => {
                const isSelected = selectedQuestion === q.question;
                return (
                  <div
                    key={q.id || idx}
                    onClick={() => setSelectedQuestion(q.question)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-snug">
                            {q.question}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <span className="text-slate-500">
                              🎯 면접관 의도: <span className="text-slate-700 font-medium">{q.intent}</span>
                            </span>
                            <span className="text-teal-700 font-semibold bg-teal-100/60 px-2 py-0.5 rounded text-[11px]">
                              직무 연계: {q.mobilityRelevance}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-teal-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Answer Input Area */}
            {selectedQuestion && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    내 실전 답변 작성
                  </label>
                  <span className="text-xs text-slate-400">
                    팁: 두괄식 주장 + 구체적 기술/전략 근거 + 직무 기여 방안
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="실제 면접관의 질문에 답변하듯 작성해주세요. (예: '저는 지원 직무의 관점에서 ~를 가장 중요한 과제로 생각합니다. 왜냐하면 최근 완성차의 ~ 추세를 볼 때...')"
                  className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm leading-relaxed bg-slate-50/40"
                />

                {evalError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200">
                    {evalError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    공백 포함 {userAnswer.length}자
                  </span>
                  <button
                    type="button"
                    disabled={evaluating || !userAnswer.trim()}
                    onClick={handleSubmitAnswer}
                    className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md flex items-center gap-2 transition ${
                      evaluating || !userAnswer.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700 active:scale-95'
                    }`}
                  >
                    {evaluating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>면접관 AI가 답변을 평가하는 중...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>답변 제출 및 피드백 받기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Feedback Results Display */}
          {currentFeedback && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-100 text-teal-800 text-xs font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 면접관의 정밀 진단서
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    모빌리티 실무 면접 피드백
                  </h3>
                </div>

                <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-sm">
                  <span className="text-xs text-slate-300">종합 환산 점수</span>
                  <span className="text-3xl font-black text-teal-300">
                    {currentFeedback.overallScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              {/* 4 Score Axes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 논리성 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">논리성 (구성)</span>
                    {renderScoreBar(currentFeedback.scores.logic)}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {currentFeedback.scoreRationales.logic}
                  </p>
                </div>

                {/* 산업 이해도 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">산업 이해도</span>
                    {renderScoreBar(currentFeedback.scores.industryKnowledge)}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {currentFeedback.scoreRationales.industryKnowledge}
                  </p>
                </div>

                {/* 직무 연결성 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">직무 연결성</span>
                    {renderScoreBar(currentFeedback.scores.jobAlignment)}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {currentFeedback.scoreRationales.jobAlignment}
                  </p>
                </div>

                {/* 구체성 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">구체성 (키워드)</span>
                    {renderScoreBar(currentFeedback.scores.concreteness)}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {currentFeedback.scoreRationales.concreteness}
                  </p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 잘한 점 2개 */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
                  <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <ThumbsUp className="w-4 h-4 text-emerald-700" />
                    면접관이 높게 평가한 점 (TOP 2)
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.strengths?.map((s, idx) => (
                      <li key={idx} className="text-xs text-emerald-950 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 보완할 점 2개 */}
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                  <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    다음 답변 시 보완할 점 (TOP 2)
                  </h4>
                  <ul className="space-y-2">
                    {currentFeedback.improvements?.map((imp, idx) => (
                      <li key={idx} className="text-xs text-amber-950 flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Improved Answer Example */}
              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-2 border border-slate-800">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  합격권 모범 개선 답변 예시 (3~4문장)
                </div>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  "{currentFeedback.improvedAnswerExample}"
                </p>
              </div>

              {/* Follow-up Tail Question */}
              <div className="p-6 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                    <span className="font-bold text-xs text-teal-900 uppercase tracking-wide">
                      면접관의 실전 꼬리질문 (이어서 답변해보세요)
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium">연계 압박 면접 시뮬레이션</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-teal-200 text-sm font-bold text-slate-900">
                  Q. {currentFeedback.followUpQuestion}
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={followUpAnswer}
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    placeholder="위 꼬리질문에 대해 즉각 방어 답변을 작성해보세요..."
                    className="w-full p-3 rounded-xl border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={evaluatingFollowUp || !followUpAnswer.trim()}
                      onClick={handleSubmitFollowUp}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:bg-slate-300 flex items-center gap-1.5"
                    >
                      {evaluatingFollowUp ? (
                        <span>꼬리질문 피드백 생성 중...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>꼬리질문 답변 제출</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Follow-up result */}
                {followUpResult && (
                  <div className="p-4 rounded-xl bg-white border border-teal-300 space-y-1.5 animate-fade-in text-xs">
                    <span className="font-bold text-teal-800 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      꼬리질문 대처 평가: {followUpResult.scoreChange}
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {followUpResult.feedbackText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
