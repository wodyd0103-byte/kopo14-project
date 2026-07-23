import type { Restaurant } from './types'

// 가게 하나가 검색어에 걸리는지 본다.
//
// 이름만 보면 "돈까스"라고 쳤을 때 '바삭돈카츠'는 나와도 돈까스를 파는 다른 집은
// 안 나온다. 그래서 카테고리·설명·주소는 물론 적어 둔 메뉴와 먹은 음식까지 훑는다.
// 24곳 규모라 매번 전부 훑어도 부담이 없다.
export function matchesQuery(restaurant: Restaurant, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  const haystack = [
    restaurant.name,
    restaurant.category,
    restaurant.description,
    restaurant.address,
    ...(restaurant.ate ?? []),
    ...(restaurant.menu ?? []).map((item) => item.name),
  ]

  return haystack.some((field) => (field ?? '').toLowerCase().includes(query))
}
