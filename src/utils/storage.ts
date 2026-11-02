import { UserProfile, JobAnalysisResult, InterviewPracticeRecord } from '../types';
import { SAMPLE_PROFILES } from './sampleData';

const KEY_PROFILE = 'mobility_coach_user_profile';
const KEY_JOB_ANALYSES = 'mobility_coach_job_analyses';
const KEY_INTERVIEWS = 'mobility_coach_interviews';

export const storage = {
  getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(KEY_PROFILE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load profile from localStorage', e);
    }
    // Default initial profile (기계공학 전공 템플릿)
    return SAMPLE_PROFILES[0].profile;
  },

  saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(KEY_PROFILE, JSON.stringify({ ...profile, lastUpdated: new Date().toISOString() }));
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
    }
  },

  getJobAnalyses(): JobAnalysisResult[] {
    try {
      const data = localStorage.getItem(KEY_JOB_ANALYSES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load analyses from localStorage', e);
    }
    return [];
  },

  saveJobAnalysis(analysis: JobAnalysisResult): JobAnalysisResult[] {
    const list = this.getJobAnalyses();
    // Prepend new analysis, filter duplicate IDs, limit to 20
    const filtered = [analysis, ...list.filter((item) => item.id !== analysis.id)].slice(0, 20);
    try {
      localStorage.setItem(KEY_JOB_ANALYSES, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to save analysis to localStorage', e);
    }
    return filtered;
  },

  updateJobAnalysis(updated: JobAnalysisResult): JobAnalysisResult[] {
    const list = this.getJobAnalyses();
    const index = list.findIndex((item) => item.id === updated.id);
    if (index !== -1) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    try {
      localStorage.setItem(KEY_JOB_ANALYSES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update analysis in localStorage', e);
    }
    return list;
  },

  deleteJobAnalysis(id: string): JobAnalysisResult[] {
    const list = this.getJobAnalyses().filter((item) => item.id !== id);
    try {
      localStorage.setItem(KEY_JOB_ANALYSES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete analysis from localStorage', e);
    }
    return list;
  },

  getInterviewPractices(): InterviewPracticeRecord[] {
    try {
      const data = localStorage.getItem(KEY_INTERVIEWS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load interviews from localStorage', e);
    }
    return [];
  },

  saveInterviewPractice(record: InterviewPracticeRecord): InterviewPracticeRecord[] {
    const list = this.getInterviewPractices();
    const updated = [record, ...list.filter((item) => item.id !== record.id)].slice(0, 30);
    try {
      localStorage.setItem(KEY_INTERVIEWS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save interview record to localStorage', e);
    }
    return updated;
  },

  updateInterviewPractice(record: InterviewPracticeRecord): InterviewPracticeRecord[] {
    const list = this.getInterviewPractices();
    const index = list.findIndex((item) => item.id === record.id);
    if (index !== -1) {
      list[index] = record;
    } else {
      list.unshift(record);
    }
    try {
      localStorage.setItem(KEY_INTERVIEWS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update interview record to localStorage', e);
    }
    return list;
  },

  deleteInterviewPractice(id: string): InterviewPracticeRecord[] {
    const list = this.getInterviewPractices().filter((item) => item.id !== id);
    try {
      localStorage.setItem(KEY_INTERVIEWS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete interview record from localStorage', e);
    }
    return list;
  },
};
