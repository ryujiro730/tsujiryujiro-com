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
  system_prompt: string | null // AI返信用の追加指示
  welcome_message: string | null // 初回会話開始時に自動送信
  avatar_url: string
  cover_url: string | null
  is_active: boolean
  reply_cost_points: number // always 1 for humanchat
  sort_order: number
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
  is_deleted: boolean
  edited_at?: string | null
  metadata?: { item_id?: string; item_name?: string; item_image_url?: string; image_url?: string } | null
}

export interface ItemCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Item {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price_points: number
  is_active: boolean
  sort_order: number
  category_id: string | null
  category?: ItemCategory | null
  created_at: string
}

export interface UserItem {
  id: string
  user_id: string
  item_id: string
  quantity: number
  created_at: string
  item?: Item
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
  bonus_points: number
  is_popular: boolean
  stripe_price_id: string
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'pack_1000',  name: '1,000ポイント',  tokens: 1000,  price_yen: 1000,  bonus_points: 0,     is_popular: false, stripe_price_id: '' },
  { id: 'pack_3000',  name: '3,300ポイント',  tokens: 3300,  price_yen: 3000,  bonus_points: 300,   is_popular: false, stripe_price_id: '' },
  { id: 'pack_5000',  name: '5,500ポイント',  tokens: 5500,  price_yen: 5000,  bonus_points: 500,   is_popular: false, stripe_price_id: '' },
  { id: 'pack_10000', name: '11,500ポイント', tokens: 11500, price_yen: 10000, bonus_points: 1500,  is_popular: true,  stripe_price_id: '' },
  { id: 'pack_30000', name: '36,000ポイント', tokens: 36000, price_yen: 30000, bonus_points: 6000,  is_popular: false, stripe_price_id: '' },
  { id: 'pack_50000', name: '65,000ポイント', tokens: 65000, price_yen: 50000, bonus_points: 15000, is_popular: false, stripe_price_id: '' },
]

