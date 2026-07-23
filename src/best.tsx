import { useState } from 'react'
import { useRestaurants } from './restaurant-context'
import { compareBy, formatRating } from './stats'

// 베스트 정렬 기준: 평점 / 리뷰수 / 좋아요
type BestSort = 'rating' | 'reviewCount' | 'likeCount'

// 베스트 페이지(/best): 선택한 기준으로 정렬해 표시
// 평점/리뷰수/좋아요는 리뷰·좋아요에서 계산된 값이므로 스토어 기준으로 정렬한다
function Best() {
  const { restaurants } = useRestaurants()
  const [sort, setSort] = useState<BestSort>('likeCount')

  const sorted = [...restaurants].sort(compareBy(sort))

  return (
    <div className="best-page">
      <div className="best-tabs">
        <button
          type="button"
          className={sort === 'rating' ? 'active' : ''}
          onClick={() => setSort('rating')}
        >
          평점순
        </button>
        <button
          type="button"
          className={sort === 'reviewCount' ? 'active' : ''}
          onClick={() => setSort('reviewCount')}
        >
          리뷰순
        </button>
        <button
          type="button"
          className={sort === 'likeCount' ? 'active' : ''}
          onClick={() => setSort('likeCount')}
        >
          좋아요순
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="empty">표시할 음식점이 없습니다.</p>
      ) : (
        <ol className="best-list">
          {sorted.map((r, index) => (
            <li key={r.id} className="best-item">
              <span className="rank">{index + 1}</span>
              {r.image ? (
                <img src={r.image} alt={r.name} width={48} height={48} />
              ) : (
                <span className="best-noimg" aria-hidden="true">
                  🍽
                </span>
              )}
              <div className="best-info">
                <p className="name">{r.name}</p>
                <p className="meta">
                  ⭐ {formatRating(r)} · 리뷰 {r.reviewCount}개 · 👍{' '}
                  {r.likeCount ?? 0}
                  {r.favoritedByMe ? ' · ♥ 찜' : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default Best
