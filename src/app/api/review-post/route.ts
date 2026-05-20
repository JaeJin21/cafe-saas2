import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { post_text, rules } = await req.json()
    if (!post_text?.trim()) {
      return NextResponse.json({ error: '홍보글 내용이 필요합니다.' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    const bannedWords: string[] = rules?.banned_words ?? []
    const notes: string = rules?.notes ?? ''
    const levelRequired: number = rules?.level_required ?? 1

    const prompt = `당신은 네이버 카페 홍보글 검수 전문가입니다. 아래 카페 규칙을 기준으로 사장님이 작성한 홍보글을 검토해주세요.

## 카페 규칙
- 금지어: ${bannedWords.length > 0 ? bannedWords.join(', ') : '없음'}
- 홍보 가능 최소 등급: ${levelRequired}등급
- 기타 규칙: ${notes || '없음'}

## 홍보글
${post_text.trim().slice(0, 3000)}

## 지시사항
1. 금지어가 포함되어 있는지 정확히 확인하세요 (부분 일치도 포함).
2. 기타 규칙에서 위반 사항이 있는지 확인하세요.
3. 홍보글의 전반적인 품질과 카페 규정 준수 여부를 평가하세요.

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "ok": true,
  "issues": [],
  "suggestion": null,
  "summary": "홍보 가능합니다. 규정 위반 사항이 없습니다."
}

문제가 있을 경우 예시:
{
  "ok": false,
  "issues": ["금지어 '홍보' 포함됨", "전화번호 직접 기재 금지 규칙 위반"],
  "suggestion": "'홍보'를 '소개'로 변경하고, 전화번호 대신 프로필 링크를 사용해보세요.",
  "summary": "2가지 규정 위반으로 수정이 필요합니다."
}`

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0].message.content ?? ''
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('review-post error:', err.message)
    return NextResponse.json({ error: '검토에 실패했습니다.' }, { status: 500 })
  }
}
