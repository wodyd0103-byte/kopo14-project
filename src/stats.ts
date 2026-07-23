import type { Like, Restaurant, RestaurantStats, Review, SortKey } from './types'

// 소수점 첫째 자리까지 반올림 (4.333… → 4.3)
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

// 리뷰 배열에서 음식점 하나의 평점/리뷰수를 계산
export function statsOf(reviews: Review[], restaurantId: number): RestaurantStats {
  const mine = reviews.filter((v) => v.restaurantId === restaurantId)
  if (mine.length === 0) return { rating: 0, reviewCount: 0 }

  const sum = mine.reduce((acc, v) => acc + v.rating, 0)
  return { rating: round1(sum / mine.length), reviewCount: mine.length }
}

// 모든 음식점의 rating/reviewCount를 리뷰 데이터 기준으로 다시 계산해 덮어씀
// (리뷰가 유일한 기준 — 저장된 값이 아니라 이 결과가 화면/정렬에 쓰임)
export function applyReviewStats(
  restaurants: Restaurant[],
  reviews: Review[],
): Restaurant[] {
  const acc = new Map<number, { sum: number; count: number }>()

  for (const v of reviews) {
    const cur = acc.get(v.restaurantId) ?? { sum: 0, count: 0 }
    cur.sum += v.rating
    cur.count += 1
    acc.set(v.restaurantId, cur)
  }

  return restaurants.map((r) => {
    const s = acc.get(r.id)
    return {
      ...r,
      rating: s ? round1(s.sum / s.count) : 0,
      reviewCount: s ? s.count : 0,
    }
  })
}

// likes 컬렉션으로부터 음식점별 좋아요 개수와 '내가 눌렀는지'를 채워 넣는다
// (rating/reviewCount처럼 저장값이 아니라 매번 계산해 내려주는 파생값)
export function applyLikes(
  restaurants: Restaurant[],
  likes: Like[],
  currentUserId: number | null,
): Restaurant[] {
  const count = new Map<number, number>()
  const mine = new Set<number>()

  for (const like of likes) {
    count.set(like.restaurantId, (count.get(like.restaurantId) ?? 0) + 1)
    if (currentUserId !== null && like.userId === currentUserId) {
      mine.add(like.restaurantId)
    }
  }

  return restaurants.map((r) => ({
    ...r,
    likeCount: count.get(r.id) ?? 0,
    likedByMe: mine.has(r.id),
  }))
}

// 화면에 찍을 평점 문자열 — 아직 리뷰가 없으면 0.0 대신 '–'
export function formatRating(restaurant: Restaurant): string {
  return restaurant.reviewCount === 0 ? '–' : restaurant.rating.toFixed(1)
}

// 정렬 지표 하나를 숫자로 뽑아낸다
function metric(r: Restaurant, key: SortKey): number {
  if (key === 'rating') return r.rating
  if (key === 'reviewCount') return r.reviewCount
  return r.likeCount ?? 0
}

// 정렬 비교 함수 — 선택 지표 우선, 동점이면 남은 지표들, 그래도 같으면 이름 순으로 고정
export function compareBy(key: SortKey) {
  const tieBreakers: SortKey[] = ['likeCount', 'rating', 'reviewCount']
  return (a: Restaurant, b: Restaurant) => {
    const primary = metric(b, key) - metric(a, key)
    if (primary !== 0) return primary

    for (const k of tieBreakers) {
      if (k === key) continue
      const diff = metric(b, k) - metric(a, k)
      if (diff !== 0) return diff
    }

    return a.name.localeCompare(b.name, 'ko')
  }
}
