import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const { url, rules_text } = await req.json()
    if (!rules_text?.trim()) {
      return NextResponse.json({ error: '규칙 텍스트가 필요합니다.' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    const truncated = rules_text.trim().slice(0, 8000)
    const groq = new Groq({ apiKey })

    const prompt = `다음은 네이버 카페의 공지/규칙 텍스트입니다. 분석해서 JSON만 반환해주세요.

카페 URL: ${url || ''}

규칙 텍스트:
${truncated}

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "name": "카페 이름 (텍스트에서 추출, 없으면 null)",
  "banned_words": ["금지어1", "금지어2"],
  "promo_days": [1, 2, 3, 4, 5],
  "promo_time_start": "09:00",
  "promo_time_end": "21:00",
  "promo_interval_days": 7,
  "level_required": 1,
  "posts_for_level_up": null,
  "comments_for_level_up": null,
  "days_for_level_up": null,
  "notes": "기타 특이사항"
}

규칙:
- promo_days는 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토. 언급 없으면 promo_days=[1,2,3,4,5], level_required=1, promo_interval_days=7.
- posts_for_level_up, comments_for_level_up, days_for_level_up는 홍보 가능 등급까지 도달하기 위한 모든 단계의 누적 합산값으로 계산하세요.
- level_required는 홍보 가능한 최소 등급의 숫자입니다. 등급명(준회원, 정회원 등)이 나오면 카페 내 순서 기준으로 숫자로 변환하세요.`

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
    console.error('analyze-rules error:', err.message)
    return NextResponse.json({ error: err.message || '분석에 실패했습니다.' }, { status: 500 })
  }
}
