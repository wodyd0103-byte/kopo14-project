import { useState } from 'react'
import { useRestaurants } from './restaurant-context'
import RestaurantList from './list'
import Modal from './modal'

// 카테고리(장르) 필터 페이지
function Category() {
  const { restaurants, toggleFavorite, toggleLike, reload } = useRestaurants()
  const [selectedCategory, setSelectedCategory] = useState('전체')
  // 리뷰 등록 후에도 최신 평점이 보이도록 객체가 아닌 id를 보관
  const [selectedId, setSelectedId] = useState<number | null>(null)

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

      <RestaurantList
        restaurants={filtered}
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
    </div>
  )
}

export default Category
