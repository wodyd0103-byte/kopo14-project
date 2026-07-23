import { createContext, useContext } from 'react'
import type { Like, Restaurant, Review } from './types'

// 앱 전역에서 공유하는 음식점 상태와 조작 함수 모음
export interface RestaurantStore {
  // rating/reviewCount는 reviews에서, likeCount/likedByMe는 likes에서 다시 계산된 값
  restaurants: Restaurant[]
  reviews: Review[]
  // 목록 재조회 (등록/수정/삭제 후 GET) — 음식점/리뷰/좋아요를 함께 가져온다
  reload: () => Promise<{
    restaurants: Restaurant[]
    reviews: Review[]
    likes: Like[]
  }>
  toggleFavorite: (restaurant: Restaurant) => void
  toggleLike: (restaurant: Restaurant) => Promise<void> // 사용자별 좋아요 토글
  addReview: (review: Omit<Review, 'id'>) => Promise<void> // 리뷰 등록 → 평점/리뷰수 즉시 반영
  removeReview: (review: Review) => Promise<void> // 리뷰 삭제 → 평점/리뷰수 즉시 반영
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
