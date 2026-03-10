'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CafeRequestForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = url.trim()
    if (!trimmed) {
      toast.error('카페 URL을 입력해주세요.')
      return
    }
    if (!trimmed.includes('cafe.naver.com')) {
      toast.error('네이버 카페 URL만 입력 가능합니다.')
      return
    }

    setLoading(true)
    // TODO: Supabase에 분석 요청 저장
    await new Promise((r) => setTimeout(r, 1500))
    setLoading(false)

    toast.success('분석 요청이 접수되었습니다! 잠시 후 결과를 확인하세요.')
    setUrl('')
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="text-lg">새로운 카페 분석 요청</CardTitle>
        <CardDescription>
          가입한 네이버 카페 URL을 입력하면 금지어, 홍보 요일, 등업 조건을 분석해드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://cafe.naver.com/your-cafe"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                분석 중...
              </>
            ) : (
              '분석 신청'
            )}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          예시: https://cafe.naver.com/myfoodblog
        </p>
      </CardContent>
    </Card>
  )
}
