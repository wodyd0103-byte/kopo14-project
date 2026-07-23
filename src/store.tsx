import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Like, Restaurant, Review } from './types'
import { API_URL } from './types'
import { useAuth } from './auth-context'
import { RestaurantContext } from './restaurant-context'
import { applyLikes, applyReviewStats, statsOf } from './stats'

interface Props {
  children: ReactNode
}

// 음식점 + 리뷰 + 좋아요 상태 관리 Provider
// 평점/리뷰수는 reviews에서, 좋아요 개수/내 좋아요는 likes에서 매번 계산해 내려준다.
function RestaurantProvider({ children }: Props) {
  const { user } = useAuth()
  const [rawRestaurants, setRawRestaurants] = useState<Restaurant[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [likes, setLikes] = useState<Like[]>([])

  // 목록 조회 (GET) — 음식점·리뷰·좋아요를 함께 가져와야 통계 계산이 가능
  const reload = useCallback(async () => {
    const [restaurantRes, reviewRes, likeRes] = await Promise.all([
      fetch(`${API_URL}/restaurants`),
      fetch(`${API_URL}/reviews`),
      fetch(`${API_URL}/likes`),
    ])
    const nextRestaurants: Restaurant[] = await restaurantRes.json()
    const nextReviews: Review[] = await reviewRes.json()
    const nextLikes: Like[] = await likeRes.json()

    setRawRestaurants(nextRestaurants)
    setReviews(nextReviews)
    setLikes(nextLikes)

    // 호출한 쪽에서 최신 데이터를 바로 쓸 수 있도록 반환 (state는 비동기 반영)
    return {
      restaurants: nextRestaurants,
      reviews: nextReviews,
      likes: nextLikes,
    }
  }, [])

  // 최초 1회 로드
  useEffect(() => {
    reload()
  }, [reload])

  // 리뷰로 평점/리뷰수를, 좋아요로 개수/내 좋아요를 덮어쓴 목록 — 화면/정렬은 이 값을 사용
  const restaurants = useMemo(
    () =>
      applyLikes(
        applyReviewStats(rawRestaurants, reviews),
        likes,
        user?.id ?? null,
      ),
    [rawRestaurants, reviews, likes, user],
  )

  // 계산된 평점/리뷰수를 음식점 레코드에도 저장 (db.json이 리뷰와 어긋나지 않도록)
  const persistStats = async (restaurantId: number, nextReviews: Review[]) => {
    await fetch(`${API_URL}/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statsOf(nextReviews, restaurantId)),
    })
  }

  // 찜 (전역 PATCH) → 재조회로 최신 상태 반영
  const toggleFavorite = async (restaurant: Restaurant) => {
    await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !restaurant.isFavorite }),
    })
    await reload()
  }

  // 사용자별 좋아요 토글 — 이미 눌렀으면 내 like 행 삭제, 아니면 새로 추가
  const toggleLike = async (restaurant: Restaurant) => {
    if (!user) return
    const mine = likes.find(
      (l) => l.restaurantId === restaurant.id && l.userId === user.id,
    )
    if (mine) {
      await fetch(`${API_URL}/likes/${mine.id}`, { method: 'DELETE' })
    } else {
      await fetch(`${API_URL}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, restaurantId: restaurant.id }),
      })
    }
    await reload()
  }

  // 리뷰 등록 (POST) → 재조회 → 해당 음식점 평점/리뷰수 갱신
  const addReview = async (review: Omit<Review, 'id'>) => {
    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    })
    if (!res.ok) throw new Error('리뷰 등록에 실패했습니다.')

    const { reviews: nextReviews } = await reload()
    await persistStats(review.restaurantId, nextReviews)
  }

  // 리뷰 삭제 (DELETE) → 재조회 → 해당 음식점 평점/리뷰수 갱신
  const removeReview = async (review: Review) => {
    const res = await fetch(`${API_URL}/reviews/${review.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('리뷰 삭제에 실패했습니다.')

    const { reviews: nextReviews } = await reload()
    await persistStats(review.restaurantId, nextReviews)
  }

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        reviews,
        reload,
        toggleFavorite,
        toggleLike,
        addReview,
        removeReview,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  )
}

export default RestaurantProvider
