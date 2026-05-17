'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AddCafeForm() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [loading, setLoading] = useState(false)

  function openModal() {
    setUrl('')
    setName('')
    setNameError(false)
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
    setUrl('')
    setName('')
    setNameError(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedUrl = url.trim()
    const trimmedName = name.trim()

    if (!trimmedUrl) {
      toast.error('카페 URL을 입력해주세요.')
      return
    }
    if (!trimmedUrl.includes('cafe.naver.com')) {
      toast.error('네이버 카페 URL만 입력 가능합니다.')
      return
    }
    if (!trimmedName) {
      setNameError(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/add-cafe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl, name: trimmedName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`"${data.name}" 카페가 추가되었습니다!`)
      closeModal()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || '카페 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-lg">카페 추가</CardTitle>
          <CardDescription>
            네이버 카페를 등록하고 AI로 홍보 규칙을 분석하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={openModal} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            카페 추가하기
          </Button>
        </CardContent>
      </Card>

      {/* 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 */}
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />

          {/* 모달 본체 */}
          <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-base">카페 추가</h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* 카페 이름 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  카페 이름 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="예: 맛집탐방 카페"
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    if (e.target.value.trim()) setNameError(false)
                  }}
                  disabled={loading}
                  className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  autoFocus
                />
                {nameError && (
                  <p className="text-xs text-destructive">카페 이름을 입력해주세요.</p>
                )}
              </div>

              {/* 카페 URL */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  카페 URL <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://cafe.naver.com/your-cafe"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  네이버 카페 주소만 입력 가능합니다.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />추가 중...</>
                ) : (
                  '카페 추가하기'
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
