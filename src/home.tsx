import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SortKey } from './types'
import { useRestaurants } from './restaurant-context'
import { compareBy } from './stats'
import { matchesQuery } from './search'
import SortTabs from './sort'
import { FavoriteFilter } from './toggle'
import SearchBox from './search-box'
import RestaurantList from './list'
import Modal from './modal'

// 홈 화면: 검색 → 찜 필터 → 정렬 후 목록 표시
function Home() {
  const { restaurants, toggleFavorite, toggleLike, reload } = useRestaurants()
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [query, setQuery] = useState('')

  // 어느 가게를 열었는지는 주소에 남긴다.
  // 링크로 공유할 수 있고, 뒤로가기가 사이트를 떠나는 대신 모달을 닫는다.
  const [params, setParams] = useSearchParams()
  const selectedId = Number(params.get('r')) || null

  const open = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('r', String(id))
    setParams(next)
  }
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('r')
    setParams(next)
  }

  const homeList = restaurants
    .filter((r) => matchesQuery(r, query))
    .filter((r) => (onlyFavorites ? r.favoritedByMe : true))
    .sort(compareBy(sortKey))

  const selected = restaurants.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <SearchBox value={query} onChange={setQuery} />

      <div className="controls">
        <SortTabs sortKey={sortKey} onChange={setSortKey} />
        <FavoriteFilter
          onlyFavorites={onlyFavorites}
          onChange={setOnlyFavorites}
        />
      </div>

      <p className="result-count">
        {homeList.length}곳
        {homeList.length !== restaurants.length && ` / 전체 ${restaurants.length}곳`}
      </p>

      <RestaurantList
        restaurants={homeList}
        onToggleFavorite={toggleFavorite}
        onToggleLike={toggleLike}
        onSelect={(r) => open(r.id)}
      />

      {selected && (
        <Modal restaurant={selected} onClose={close} onDeleted={reload} />
      )}
    </>
  )
}

export default Home
