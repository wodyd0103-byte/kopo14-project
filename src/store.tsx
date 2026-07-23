import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Favorite, Like, Restaurant, Review } from './types'
import { API_URL } from './types'
import { useAuth } from './auth-context'
import { RestaurantContext } from './restaurant-context'
import { applyFavorites, applyLikes, applyReviewStats, statsOf } from './stats'
import { focusLoginForm } from './login-focus'

interface Props {
  children: ReactNode
}

// 다른 기기에서 등록한 가게나 리뷰가 새로고침 없이도 보이도록 주기적으로 다시 읽는다.
// 너무 잦으면 입력 중에 목록이 계속 흔들리고, 너무 뜸하면 같이 쓰는 맛이 없다.
const POLL_MS = 10000

// 음식점 + 리뷰 + 좋아요 + 찜 상태 관리 Provider
// 평점/리뷰수는 reviews에서, 좋아요는 likes에서, 찜은 favorites에서 매번 계산해 내려준다.
function RestaurantProvider({ children }: Props) {
  const { user } = useAuth()
  const [rawRestaurants, setRawRestaurants] = useState<Restaurant[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])

  // 첫 조회가 끝나기 전에는 '없음'과 '아직 모름'을 구분해야 한다.
  // 구분하지 않으면 불러오는 동안 "표시할 음식점이 없습니다"가 뜬다.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 연타로 같은 요청이 두 번 나가는 것을 막는다.
  // state가 아니라 ref다 — 렌더를 기다리면 이미 두 번째 클릭이 지나간 뒤다.
  const busy = useRef(new Set<string>())

  const fetchAll = useCallback(async () => {
    const [restaurantRes, reviewRes, likeRes, favoriteRes] = await Promise.all([
      fetch(`${API_URL}/restaurants`),
      fetch(`${API_URL}/reviews`),
      fetch(`${API_URL}/likes`),
      fetch(`${API_URL}/favorites`),
    ])

    for (const res of [restaurantRes, reviewRes, likeRes, favoriteRes]) {
      if (!res.ok) throw new Error(`서버가 ${res.status}로 응답했습니다.`)
    }

    const nextRestaurants: Restaurant[] = await restaurantRes.json()
    const nextReviews: Review[] = await reviewRes.json()
    const nextLikes: Like[] = await likeRes.json()
    const nextFavorites: Favorite[] = await favoriteRes.json()

    setRawRestaurants(nextRestaurants)
    setReviews(nextReviews)
    setLikes(nextLikes)
    setFavorites(nextFavorites)
    setError(null)

    // 호출한 쪽에서 최신 데이터를 바로 쓸 수 있도록 반환 (state는 비동기 반영)
    return {
      restaurants: nextRestaurants,
      reviews: nextReviews,
      likes: nextLikes,
      favorites: nextFavorites,
    }
  }, [])

  // 목록 재조회. 실패하면 화면에 알린다 — 조용히 빈 목록을 보여주면
  // 데이터가 없는 것인지 서버가 죽은 것인지 알 수 없다.
  const reload = useCallback(async () => {
    try {
      const data = await fetchAll()
      return data
    } catch (err) {
      setError(
        err instanceof Error
          ? `데이터를 불러오지 못했습니다. (${err.message})`
          : '데이터를 불러오지 못했습니다.',
      )
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchAll])

  // 최초 1회 로드
  useEffect(() => {
    reload().catch(() => {
      // reload가 이미 error 상태로 알렸다. 여기서 더 할 일은 없다.
    })
  }, [reload])

  // 주기적 갱신. 다른 탭에 가 있을 때는 돌리지 않는다.
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return
      fetchAll().catch(() => {
        // 잠깐 끊긴 것일 수 있다. 첫 로드와 달리 화면을 흔들지 않고 다음 차례를 기다린다.
      })
    }

    const timer = window.setInterval(tick, POLL_MS)
    // 다른 탭을 보다 돌아오면 기다리지 않고 바로 맞춘다
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [fetchAll])

  // 리뷰로 평점/리뷰수를, 좋아요·찜으로 내 표시를 덮어쓴 목록 — 화면/정렬은 이 값을 사용
  const restaurants = useMemo(
    () =>
      applyFavorites(
        applyLikes(
          applyReviewStats(rawRestaurants, reviews),
          likes,
          user?.id ?? null,
        ),
        favorites,
        user?.id ?? null,
      ),
    [rawRestaurants, reviews, likes, favorites, user],
  )

  // 쓰는 동작은 전부 여기를 지난다. 로그인 안 했으면 막고 로그인 폼으로 시선을 옮긴다.
  // 화면에서도 버튼을 감추지만, 그건 안내일 뿐이고 실제 차단은 이 한 곳에서 한다.
  const ensureLogin = () => {
    if (user) return true
    focusLoginForm()
    return false
  }

  // 같은 대상에 대한 요청이 끝나기 전에 또 누르면 무시한다.
  // 없으면 빠르게 두 번 눌렀을 때 둘 다 '아직 안 눌렸다'고 보고 두 줄이 생긴다.
  const runOnce = async (key: string, job: () => Promise<void>) => {
    if (busy.current.has(key)) return
    busy.current.add(key)
    try {
      await job()
    } finally {
      busy.current.delete(key)
    }
  }

  // 계산된 평점/리뷰수를 음식점 레코드에도 저장 (db.json이 리뷰와 어긋나지 않도록)
  const persistStats = async (restaurantId: number, nextReviews: Review[]) => {
    await fetch(`${API_URL}/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statsOf(nextReviews, restaurantId)),
    })
  }

  // 사용자별 찜 토글 — 이미 찜했으면 내 행 삭제, 아니면 새로 추가
  const toggleFavorite = async (restaurant: Restaurant) => {
    if (!ensureLogin() || !user) return

    await runOnce(`fav:${restaurant.id}`, async () => {
      const mine = favorites.find(
        (f) => f.restaurantId === restaurant.id && f.userId === user.id,
      )
      if (mine) {
        await fetch(`${API_URL}/favorites/${mine.id}`, { method: 'DELETE' })
      } else {
        await fetch(`${API_URL}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, restaurantId: restaurant.id }),
        })
      }
      await reload()
    })
  }

  // 사용자별 좋아요 토글 — 이미 눌렀으면 내 like 행 삭제, 아니면 새로 추가
  const toggleLike = async (restaurant: Restaurant) => {
    if (!ensureLogin() || !user) return

    await runOnce(`like:${restaurant.id}`, async () => {
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
    })
  }

  // 리뷰 등록 (POST) → 재조회 → 해당 음식점 평점/리뷰수 갱신
  // 작성자는 화면에서 받지 않고 로그인 사용자로 고정한다 (남의 이름 사칭 방지)
  const addReview = async (review: Omit<Review, 'id' | 'userId' | 'author'>) => {
    if (!ensureLogin() || !user) return

    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...review,
        userId: user.id,
        author: user.nickname,
      }),
    })
    if (!res.ok) throw new Error('리뷰 등록에 실패했습니다.')

    const { reviews: nextReviews } = await reload()
    await persistStats(review.restaurantId, nextReviews)
  }

  // 리뷰 삭제 (DELETE) → 재조회 → 해당 음식점 평점/리뷰수 갱신
  const removeReview = async (review: Review) => {
    if (!ensureLogin() || !user) return
    // 화면에서도 남의 리뷰에는 삭제 버튼을 감추지만, 실제 차단은 여기서 한다
    if (review.userId !== user.id) {
      throw new Error('내가 쓴 리뷰만 삭제할 수 있습니다.')
    }

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
        loading,
        error,
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
