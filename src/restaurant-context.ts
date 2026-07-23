import { createContext, useContext } from 'react'
import type { Favorite, Like, Restaurant, Review } from './types'

// 앱 전역에서 공유하는 음식점 상태와 조작 함수 모음
export interface RestaurantStore {
  // rating/reviewCount는 reviews에서, likeCount/likedByMe는 likes에서,
  // favoritedByMe는 favorites에서 다시 계산된 값
  restaurants: Restaurant[]
  reviews: Review[]
  // 첫 조회가 끝났는지. '아직 모름'과 '없음'을 구분하는 데 쓴다.
  loading: boolean
  // 불러오기에 실패한 이유 (성공하면 null)
  error: string | null
  // 목록 재조회 (등록/수정/삭제 후 GET) — 음식점/리뷰/좋아요/찜을 함께 가져온다
  reload: () => Promise<{
    restaurants: Restaurant[]
    reviews: Review[]
    likes: Like[]
    favorites: Favorite[]
  }>
  toggleFavorite: (restaurant: Restaurant) => Promise<void> // 사용자별 찜 토글
  toggleLike: (restaurant: Restaurant) => Promise<void> // 사용자별 좋아요 토글
  // 작성자는 로그인 사용자로 고정되므로 호출하는 쪽이 정하지 않는다
  addReview: (
    review: Omit<Review, 'id' | 'userId' | 'author'>,
  ) => Promise<void>
  removeReview: (review: Review) => Promise<void> // 본인 리뷰만
}

export const RestaurantContext = createContext<RestaurantStore | null>(null)

// Provider 안에서만 사용하는 접근용 훅
export function useRestaurants(): RestaurantStore {
  const ctx = useContext(RestaurantContext)
  if (!ctx) {
    throw new Error('useRestaurants는 RestaurantProvider 안에서 사용해야 합니다.')
  }
  return ctx
}
