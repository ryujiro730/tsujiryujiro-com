export interface UserVars {
  display_name?: string | null
  age?: number | null
  gender?: 'male' | 'female' | 'other' | string | null
}

const GENDER_LABEL: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
}

/**
 * メッセージ内の変数をユーザー情報に置換する。
 * 対応変数:
 *   $nickname$ → display_name
 *   $age$      → age（数値）
 *   $gender$   → gender（男性/女性/その他）
 */
export function resolveVariables(template: string, user: UserVars): string {
  return template
    .replace(/\$nickname\$/g, user.display_name ?? '')
    .replace(/\$age\$/g, user.age != null ? String(user.age) : '')
    .replace(/\$gender\$/g, user.gender ? (GENDER_LABEL[user.gender] ?? user.gender) : '')
}
