export type BusinessType = 'shopping' | 'food' | 'beauty' | 'education' | 'realestate' | 'travel' | 'it' | 'other'

export interface UserProfile {
  id: string
  email: string
  nickname: string | null
  business_name: string | null
  business_type: BusinessType | null
  phone: string | null
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}
