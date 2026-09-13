import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export type Reminder = {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type MoodEntry = {
  id: string;
  mood: 'good' | 'okay' | 'low';
  note: string | null;
  created_at: string;
};

export type ActivitySession = {
  id: string;
  activity_type: string;
  score: number | null;
  completed: boolean;
  created_at: string;
};

export type Keepsake = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'companion';
  text: string;
  action: string | null;
  created_at: string;
};

export type Progress = {
  id: number;
  level: number;
  total_stars: number;
  current_streak: number;
  longest_streak: number;
  updated_at: string;
};
