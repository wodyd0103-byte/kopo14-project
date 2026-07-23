import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRestaurants } from './restaurant-context'
import RestaurantList from './list'
import Modal from './modal'

// 카테고리(장르) 필터 페이지
function Category() {
  const { restaurants, toggleFavorite, toggleLike, reload } = useRestaurants()
  const [selectedCategory, setSelectedCategory] = useState('전체')

  // 홈과 같은 방식 — 연 가게를 주소에 남긴다
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

  // 데이터에 존재하는 카테고리 목록 (+ 전체)
  const categories = [
    '전체',
    ...Array.from(new Set(restaurants.map((r) => r.category))),
  ]

  const filtered =
    selectedCategory === '전체'
      ? restaurants
      : restaurants.filter((r) => r.category === selectedCategory)

  const selected = restaurants.find((r) => r.id === selectedId) ?? null

  return (
    <div className="category-page">
      <div className="category-filter">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={selectedCategory === c ? 'active' : ''}
            onClick={() => setSelectedCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="result-count">{filtered.length}곳</p>

      <RestaurantList
        restaurants={filtered}
        onToggleFavorite={toggleFavorite}
        onToggleLike={toggleLike}
        onSelect={(r) => open(r.id)}
      />

      {selected && (
        <Modal restaurant={selected} onClose={close} onDeleted={reload} />
      )}
    </div>
  )
}

export default Category
