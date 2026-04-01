export type UserRole = 'user' | 'staff' | 'admin'

export interface Profile {
  id: string
  user_code: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  points: number // token count
  free_messages_used: number // 0-5 (free quota)
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  last_login_at: string | null
  created_at: string
}

export interface AdminUserView extends Profile {
  total_charged: number
  last_payment_at: string | null
}

export interface Character {
  id: string
  name: string
  age: number
  description: string
  personality: string
  avatar_url: string
  cover_url: string | null
  is_active: boolean
  reply_cost_points: number // always 1 for humanchat
  created_at: string
}

export interface CharacterPhoto {
  id: string
  character_id: string
  url: string
  caption: string | null
  order_index: number
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  character_id: string
  last_message_at: string
  is_unread_staff: boolean
  character?: Character
  user?: Profile
  last_message?: Message
}

export interface Message {
  id: string
  conversation_id: string
  sender_role: 'user' | 'character'
  content: string
  points_used: number
  is_read: boolean
  created_at: string
}

export interface PointTransaction {
  id: string
  user_id: string
  amount: number
  type: 'purchase' | 'spend'
  description: string
  created_at: string
}

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price_yen: number
  is_popular: boolean
  stripe_price_id: string
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'pack_10', name: '10トークン', tokens: 10, price_yen: 400, is_popular: false, stripe_price_id: 'price_10tokens' },
  { id: 'pack_30', name: '30トークン', tokens: 30, price_yen: 1000, is_popular: true, stripe_price_id: 'price_30tokens' },
  { id: 'pack_100', name: '100トークン', tokens: 100, price_yen: 2500, is_popular: false, stripe_price_id: 'price_100tokens' },
]

export const FREE_MESSAGE_LIMIT = 5
