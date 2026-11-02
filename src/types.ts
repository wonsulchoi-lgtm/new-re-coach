export interface UserProfile {
  major: string;
  grade: string;
  targetJob: string;
  experiences: string;
  skills: string[];
  lastUpdated?: string;
}

export interface RadarScores {
  knowledge: number; // 0-100
  skills: number;    // 0-100
  experience: number;// 0-100
  attitude: number;  // 0-100
}

export interface MissingCompetency {
  name: string;
  category: '지식' | '스킬' | '경험' | '태도';
  importance: '필수' | '우대' | '권장';
  gapDescription: string;
  actionItems: string[];
}

export interface RoadmapTask {
  id: string;
  text: string;
  done: boolean;
  deliverableTip: string;
}

export interface RoadmapWeek {
  week: number;
  theme: string;
  description: string;
  tasks: RoadmapTask[];
}

export interface JobAnalysisResult {
  id: string;
  createdAt: string;
  jobTitleInput?: string;
  rawJobPosting: string;
  estimatedCompany: string;
  estimatedJobTitle: string;
  domainCategory: string;
  summary: string;
  requiredKnowledge: { title: string; reason: string }[];
  requiredSkills: { title: string; reason: string }[];
  preferredExperiences: { title: string; reason: string }[];
  requiredAttitudes: { title: string; reason: string }[];
  topKeywords: string[];
  matchScore: number;
  scoreReason: string;
  radarScores: RadarScores;
  missingCompetencies: MissingCompetency[];
  roadmap?: RoadmapWeek[];
}

export interface IssueBrief {
  issueTopic: string;
  summary: {
    background: string;
    currentStatus: string;
    implication: string;
  };
  questions: {
    id: string;
    question: string;
    intent: string;
    mobilityRelevance: string;
  }[];
}

export interface InterviewFeedbackScores {
  logic: number;             // 1-5
  industryKnowledge: number; // 1-5
  jobAlignment: number;      // 1-5
  concreteness: number;      // 1-5
}

export interface InterviewFeedbackResult {
  overallScore: number; // 0-100
  scores: InterviewFeedbackScores;
  scoreRationales: {
    logic: string;
    industryKnowledge: string;
    jobAlignment: string;
    concreteness: string;
  };
  strengths: string[];
  improvements: string[];
  improvedAnswerExample: string;
  followUpQuestion: string;
}

export interface InterviewPracticeRecord {
  id: string;
  createdAt: string;
  issueTopic: string;
  question: string;
  userAnswer: string;
  targetJobSnapshot: string;
  feedback: InterviewFeedbackResult;
  followUpAnswer?: string;
  followUpFeedback?: {
    feedbackText: string;
    scoreChange: string;
  };
}
