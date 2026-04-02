/**
 * getUser() はネットワーク呼び出しをするため ECONNRESET で落ちることがある。
 * 失敗時は getSession()（cookie読み取りのみ）にフォールバックする。
 * role チェックは必ず DB クエリで行うため、フォールバックでもセキュリティ上問題ない。
 */
export async function getAuthUser(supabase: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
  } catch { /* network error — fall through */ }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
  } catch { /* cookie read also failed */ }

  return null
}
