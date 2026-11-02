import React, { useState } from 'react';
import { UserProfile } from '../types';
import { SAMPLE_PROFILES, POPULAR_SKILL_TAGS } from '../utils/sampleData';
import { Check, Sparkles, Plus, X, Save, BookmarkCheck, Briefcase, GraduationCap, Award, Wrench } from 'lucide-react';

interface ProfileTabProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
  onNavigateToAnalyzer: () => void;
}

const JOB_OPTIONS = [
  '연구개발(기계)',
  '전장·임베디드SW',
  '배터리·소재',
  '자율주행·AI',
  '생산기술',
  '품질',
  '구매',
  '영업·마케팅',
  '인사·경영지원',
  '기타',
];

const GRADE_OPTIONS = [
  '3학년',
  '4학년 1학기',
  '4학년 2학기',
  '졸업예정 (2025.08 / 2026.02)',
  '기졸업 (구직 중)',
  '대학원 석사 과정/예정',
];

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSaveProfile, onNavigateToAnalyzer }) => {
  const [form, setForm] = useState<UserProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [savedAlert, setSavedAlert] = useState(false);

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed || form.skills.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleApplySample = (sample: UserProfile) => {
    setForm(sample);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(form);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner / Templates */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              1:1 맞춤형 진단의 출발점
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              내 모빌리티 취업 프로필
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              전공, 보유 기술, 프로젝트 경험을 등록해두면 공고 분석 시 적합도 갭을 정밀하게 진단하고 맞춤 면접 질문을 뽑아냅니다.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-xs text-slate-300 font-medium">빠른 체험용 예시 불러오기:</span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROFILES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(sample.profile)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-teal-600/30 hover:border-teal-400 text-slate-200 border border-slate-700 transition"
                >
                  {sample.label.split(' ')[0]} 템플릿
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {savedAlert && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">프로필이 브라우저에 안전하게 저장되었습니다!</p>
              <p className="text-xs text-emerald-700">이제 [공고 분석기]에서 채용공고를 붙여넣고 내 프로필과의 갭을 확인해보세요.</p>
            </div>
          </div>
          <button
            onClick={onNavigateToAnalyzer}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow"
          >
            공고 분석하러 가기 &rarr;
          </button>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 전공 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              전공 (학과)
            </label>
            <input
              type="text"
              required
              value={form.major}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
              placeholder="예: 기계공학과, 전자공학부, 미래모빌리티학과"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-slate-50/50"
            />
          </div>

          {/* 학년/졸업예정 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
              <BookmarkCheck className="w-4 h-4 text-teal-600" />
              학년 / 졸업 상태
            </label>
            <select
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* 희망 직무군 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
              <Briefcase className="w-4 h-4 text-teal-600" />
              희망 직무군
            </label>
            <select
              value={form.targetJob}
              onChange={(e) => setForm({ ...form, targetJob: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white font-medium text-slate-900"
            >
              {JOB_OPTIONS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 보유 스킬 태그 */}
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-800 mb-2">
            <span className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-teal-600" />
              보유 기술 / 툴 / 지식 태그
            </span>
            <span className="text-xs font-normal text-slate-500">엔터 또는 추가 버튼으로 태그화</span>
          </label>

          {/* Tag Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(newSkill);
                }
              }}
              placeholder="예: CATIA, CAN 통신, C++, MATLAB, 배터리 BMS 등 입력 후 추가"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => handleAddSkill(newSkill)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> 추가
            </button>
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[50px] items-center">
            {form.skills.length === 0 ? (
              <span className="text-xs text-slate-400">등록된 스킬 태그가 없습니다. 아래 추천 태그를 클릭해보세요.</span>
            ) : (
              form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500 ml-1 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Recommended tags */}
          <div className="mt-2.5">
            <p className="text-xs font-medium text-slate-500 mb-1.5">모빌리티 인기 스킬 (클릭하여 추가):</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILL_TAGS.map((tag) => {
                const isSelected = form.skills.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddSkill(tag)}
                    disabled={isSelected}
                    className={`text-xs px-2.5 py-1 rounded-md border transition ${
                      isSelected
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/50'
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 보유 경험 자유 기술 */}
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-800 mb-2">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              보유 경험 (동아리, 캡스톤 프로젝트, 인턴, 자격증, 연구실)
            </span>
            <span className="text-xs font-normal text-slate-500">형식에 구애받지 않고 자유롭게 적어주세요</span>
          </label>
          <textarea
            rows={6}
            value={form.experiences}
            onChange={(e) => setForm({ ...form, experiences: e.target.value })}
            placeholder="[자작자동차 동아리]
- 서스펜션 기구학 설계 및 CATIA 도면화
- 코너링 안정성 시뮬레이션 및 프레임 경량화 15kg 달성

[캡스톤 프로젝트]
- 전기차 배터리 모니터링 CAN 통신 노드 구현
- LabVIEW 및 STM32를 연동한 실시간 전압/온도 로깅

[자격증]
- 일반기계기사, 토익스피킹 AL"
            className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm leading-relaxed font-mono bg-slate-50/30"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            ※ 실제 공고 분석 시 AI가 이 텍스트와 공고의 요구역량을 1:1로 대조하여 부족한 역량과 강점을 도출합니다.
          </p>
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {profile.lastUpdated && (
              <span>마지막 저장: {new Date(profile.lastUpdated).toLocaleDateString()} {new Date(profile.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              프로필 저장하기
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
