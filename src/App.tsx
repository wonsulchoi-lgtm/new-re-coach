import React, { useState, useEffect } from 'react';
import { UserProfile, JobAnalysisResult, InterviewPracticeRecord } from './types';
import { storage } from './utils/storage';
import { ProfileTab } from './components/ProfileTab';
import { JobAnalyzerTab } from './components/JobAnalyzerTab';
import { InterviewPracticeTab } from './components/InterviewPracticeTab';
import { DashboardTab } from './components/DashboardTab';
import {
  Compass,
  FileSearch,
  MessageSquare,
  User,
  LayoutDashboard,
  ShieldCheck,
  Zap,
} from 'lucide-react';

type TabKey = 'dashboard' | 'profile' | 'analyzer' | 'interview';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('analyzer');
  const [profile, setProfile] = useState<UserProfile>(() => storage.getProfile());
  const [analyses, setAnalyses] = useState<JobAnalysisResult[]>(() => storage.getJobAnalyses());
  const [interviewRecords, setInterviewRecords] = useState<InterviewPracticeRecord[]>(() =>
    storage.getInterviewPractices()
  );

  // Selected topic passed from analyzer to interview practice
  const [interviewInitialTopic, setInterviewInitialTopic] = useState<string | undefined>(undefined);

  // Profile Save
  const handleSaveProfile = (updated: UserProfile) => {
    setProfile(updated);
    storage.saveProfile(updated);
  };

  // Job Analysis Handlers
  const handleSaveAnalysis = (analysis: JobAnalysisResult) => {
    const updated = storage.saveJobAnalysis(analysis);
    setAnalyses(updated);
  };

  const handleUpdateAnalysis = (analysis: JobAnalysisResult) => {
    const updated = storage.updateJobAnalysis(analysis);
    setAnalyses(updated);
  };

  const handleDeleteAnalysis = (id: string) => {
    const updated = storage.deleteJobAnalysis(id);
    setAnalyses(updated);
  };

  // Interview Handlers
  const handleSavePractice = (record: InterviewPracticeRecord) => {
    const updated = storage.saveInterviewPractice(record);
    setInterviewRecords(updated);
  };

  const handleUpdatePractice = (record: InterviewPracticeRecord) => {
    const updated = storage.updateInterviewPractice(record);
    setInterviewRecords(updated);
  };

  const handleDeletePractice = (id: string) => {
    const updated = storage.deleteInterviewPractice(id);
    setInterviewRecords(updated);
  };

  const handleNavigateToInterviewWithTopic = (topic: string) => {
    setInterviewInitialTopic(topic);
    setActiveTab('interview');
  };

  const navItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'dashboard', label: '대시보드', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'profile', label: '내 프로필', icon: <User className="w-4 h-4" /> },
    {
      key: 'analyzer',
      label: '공고 분석기',
      icon: <FileSearch className="w-4 h-4" />,
      badge: '핵심',
    },
    { key: 'interview', label: '이슈 면접 연습', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md group-hover:scale-105 transition">
              <Compass className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base md:text-lg tracking-tight text-white group-hover:text-teal-300 transition">
                  모빌리티 커리어 코치
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Mobility AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                채용공고 갭 분석 · 4주 로드맵 · 실전 이슈 면접 코칭
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 relative ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isActive ? 'bg-slate-950 text-teal-300' : 'bg-teal-400/20 text-teal-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Mini Badge at Top Right */}
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
            title="프로필 확인 및 수정"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-teal-400/40 flex items-center justify-center text-teal-300 text-xs font-bold">
              {profile.major ? profile.major.charAt(0) : 'M'}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                {profile.major || '프로필 미입력'}
              </p>
              <p className="text-[10px] text-teal-400 truncate max-w-[120px]">
                {profile.targetJob || '직무 미지정'}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Header Tabs */}
        <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-950 border-t border-slate-800/80 gap-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab
            profile={profile}
            analyses={analyses}
            interviewRecords={interviewRecords}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onNavigateToAnalyzer={() => setActiveTab('analyzer')}
          />
        )}

        {activeTab === 'analyzer' && (
          <JobAnalyzerTab
            profile={profile}
            analyses={analyses}
            onSaveAnalysis={handleSaveAnalysis}
            onUpdateAnalysis={handleUpdateAnalysis}
            onDeleteAnalysis={handleDeleteAnalysis}
            onNavigateToInterviewWithTopic={handleNavigateToInterviewWithTopic}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewPracticeTab
            profile={profile}
            practiceRecords={interviewRecords}
            onSavePractice={handleSavePractice}
            onUpdatePractice={handleUpdatePractice}
            onDeletePractice={handleDeletePractice}
            initialTopic={interviewInitialTopic}
          />
        )}
      </main>

      {/* Trust & Compliance Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>모빌리티 커리어 코치 (Mobility Career Coach)</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Vercel Serverless Ready
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span>서버 저장 없음 · 브라우저 로컬 저장소 동작</span>
              <span>개인정보 수집 안 함</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed text-center sm:text-left">
            안내: 본 서비스의 채용공고 분석, 적합도 점수 및 면접 피드백은 지원자의 공개 텍스트에 기반한 AI 모의 분석 결과이며,
            기업의 실제 채용 평가 결과나 합격을 보장하지 않습니다. 모빌리티 산업 분야의 성공적인 커리어 설계를 응원합니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
