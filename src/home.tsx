import { useState } from 'react'
import type { SortKey } from './types'
import { useRestaurants } from './restaurant-context'
import { compareBy } from './stats'
import SortTabs from './sort'
import { FavoriteFilter } from './toggle'
import RestaurantList from './list'
import Modal from './modal'

// 홈 화면: 찜 필터 → 정렬(평점/리뷰) 후 목록 표시
function Home() {
  const { restaurants, toggleFavorite, toggleLike, reload } = useRestaurants()
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  // 리뷰 등록 후에도 최신 평점이 보이도록 객체가 아닌 id를 보관
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const homeList = restaurants
    .filter((r) => (onlyFavorites ? r.favoritedByMe : true))
    .sort(compareBy(sortKey))

  const selected = restaurants.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <div className="controls">
        <SortTabs sortKey={sortKey} onChange={setSortKey} />
        <FavoriteFilter
          onlyFavorites={onlyFavorites}
          onChange={setOnlyFavorites}
        />
      </div>

      <RestaurantList
        restaurants={homeList}
        onToggleFavorite={toggleFavorite}
        onToggleLike={toggleLike}
        onSelect={(r) => setSelectedId(r.id)}
      />

      {selected && (
        <Modal
          restaurant={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={reload}
        />
      )}
    </>
  )
}

export default Home
