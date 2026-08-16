import { createClient } from '@supabase/supabase-js';

// อ่านค่าจาก environment variables ก่อนเป็นอันดับแรก
// หากไม่มี ให้ใช้ค่าเริ่มต้น (Fallback) เพื่อป้องกัน error "supabaseUrl is required"
const FALLBACK_SUPABASE_URL = 'https://srptlshnxfmphwsnxcja.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = '';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  // เตือนใน console หากยังไม่ได้ตั้งค่า anon key (ต้องตั้งใน Vars / Environment Variables)
  console.warn(
    '[v0] VITE_SUPABASE_ANON_KEY ยังไม่ได้ถูกตั้งค่า โปรดเพิ่มใน Vars / Environment Variables ของ v0'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
