import { toast } from 'sonner'

export type NotifyChannel = 'toast'
// 확장 예정: | 'kakao' | 'sms' | 'push'

export interface NotifyPayload {
  title: string
  description?: string
  channel?: NotifyChannel
  action?: { label: string; onClick: () => void }
}

export function notify({ title, description, channel = 'toast', action }: NotifyPayload) {
  switch (channel) {
    case 'toast':
      toast(title, {
        ...(description ? { description } : {}),
        ...(action ? { action: { label: action.label, onClick: action.onClick } } : {}),
      })
      break
    // case 'kakao': sendKakaoMessage(userId, title, description); break
    // case 'sms': sendSMS(phone, `${title}: ${description}`); break
  }
}
