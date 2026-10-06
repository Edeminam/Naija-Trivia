import type { CategorySlug, QuestionStatus } from "@ntc/shared";

export interface AdminQuestion {
  id: string;
  category: CategorySlug;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  fact: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  status: QuestionStatus;
  timesShown: number;
  timesCorrect: number;
  accuracy: number | null;
  avgMs: number;
  reportCount: number;
  reviewerNotes: string | null;
  authorName: string | null;
  reviewerName: string | null;
  createdAt: string;
  updatedAt: string;
  reports?: { reason: string; note: string | null; status: string; created_at: string }[];
}

export interface QuestionList {
  items: AdminQuestion[];
  total: number;
  page: number;
  pageSize: number;
}
