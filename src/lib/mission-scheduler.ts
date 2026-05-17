export type ScheduledMission = {
  cafe_id: string
  mission_date: string
  mission_type: 'promo_post' | 'comment' | 'level_up_post' | 'check_rule'
  title: string
  content: string
}

function dateStr(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

const POSTS_INTERVAL_DAYS = 2  // 게시글: 2일에 1개
const COMMENTS_PER_DAY = 2     // 댓글: 하루 최대 2개

export function buildSchedule(
  cafeId: string,
  cafeName: string,
  rules: {
    level_required: number
    posts_for_level_up: number | null
    comments_for_level_up: number | null
    days_for_level_up: number | null
    promo_interval_days: number
  },
  status: {
    current_level: number
    post_count: number
    comment_count: number
    active_days: number
    last_promo_date: string | null
  },
  startDate: Date
): ScheduledMission[] {
  const missions: ScheduledMission[] = []

  const postsNeeded = Math.max(0, (rules.posts_for_level_up ?? 0) - status.post_count)
  const commentsNeeded = Math.max(0, (rules.comments_for_level_up ?? 0) - status.comment_count)
  const daysNeeded = Math.max(0, (rules.days_for_level_up ?? 0) - status.active_days)
  const gradeOk = status.current_level >= rules.level_required
  const conditionsOk = postsNeeded === 0 && commentsNeeded === 0 && daysNeeded === 0

  // 등급 달성 + 모든 조건 충족 → 홍보 가능 여부 확인
  if (gradeOk && conditionsOk) {
    const today = new Date(startDate)
    today.setHours(0, 0, 0, 0)
    let canPromo = true
    if (status.last_promo_date) {
      const next = new Date(new Date(status.last_promo_date).getTime() + rules.promo_interval_days * 86400000)
      if (next > today) canPromo = false
    }
    if (canPromo) {
      missions.push({
        cafe_id: cafeId,
        mission_date: dateStr(startDate, 0),
        mission_type: 'promo_post',
        title: `${cafeName} 홍보 게시글 작성`,
        content: '오늘 홍보 가능한 날입니다!',
      })
    }
    return missions
  }

  // 등업 미션

  // 게시글: POSTS_INTERVAL_DAYS 간격으로 1개씩
  for (let i = 0; i < postsNeeded; i++) {
    missions.push({
      cafe_id: cafeId,
      mission_date: dateStr(startDate, i * POSTS_INTERVAL_DAYS),
      mission_type: 'level_up_post',
      title: `[${cafeName}] 게시글 작성 ${i + 1}/${postsNeeded}`,
      content: `등업까지 게시글 ${postsNeeded - i}개 남았습니다`,
    })
  }

  // 댓글: 하루 COMMENTS_PER_DAY개씩
  for (let i = 0; i < commentsNeeded; i++) {
    missions.push({
      cafe_id: cafeId,
      mission_date: dateStr(startDate, Math.floor(i / COMMENTS_PER_DAY)),
      mission_type: 'comment',
      title: `[${cafeName}] 댓글 달기 ${i + 1}/${commentsNeeded}`,
      content: `등업까지 댓글 ${commentsNeeded - i}개 남았습니다`,
    })
  }

  // 활동일: 오늘 한 번 안내 (기다리는 것 외에 방법 없음)
  if (daysNeeded > 0) {
    missions.push({
      cafe_id: cafeId,
      mission_date: dateStr(startDate, 0),
      mission_type: 'check_rule',
      title: `[${cafeName}] 활동일 ${daysNeeded}일 대기 중`,
      content: `매일 활동하면 ${daysNeeded}일 후 등업 조건 달성`,
    })
  }

  return missions
}
