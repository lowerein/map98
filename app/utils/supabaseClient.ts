// app/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// 讀取 .env.local 裡面嘅全域變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 建立並匯出 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);