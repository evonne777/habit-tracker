import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const isCloudConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export function getAuthRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.href).toString()
}

export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLocaleLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return '邮箱或密码不正确'
  }
  if (normalized.includes('email not confirmed')) {
    return '请先打开邮箱中的确认邮件'
  }
  if (normalized.includes('user already registered')) {
    return '这个邮箱已经注册，请直接登录'
  }
  if (normalized.includes('password should be at least')) {
    return '密码至少需要 6 位'
  }
  if (normalized.includes('rate limit')) {
    return '操作过于频繁，请稍后再试'
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return '网络连接失败，请检查网络后重试'
  }

  return message || '操作失败，请稍后重试'
}
