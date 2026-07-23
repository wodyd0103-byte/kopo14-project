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

  // 데이터에 존재하는 카테고리 목록 (+ 전체).
  // 개수를 함께 보여 준다. 눌러 보고 나서야 한 곳뿐인 걸 아는 것보다 낫다.
  const counts = new Map<string, number>()
  for (const r of restaurants) {
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }

  const categories = [
    { name: '전체', count: restaurants.length },
    ...Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'),
    ),
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
            key={c.name}
            type="button"
            className={selectedCategory === c.name ? 'active' : ''}
            onClick={() => setSelectedCategory(c.name)}
          >
            {c.name}
            <span className="category-count">{c.count}</span>
          </button>
        ))}
      </div>

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
