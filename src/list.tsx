import type { Restaurant } from './types'
import { formatRating } from './stats'
import { FavoriteButton } from './toggle'
import { LikeButton } from './like'

interface Props {
  restaurants: Restaurant[]
  onToggleFavorite: (restaurant: Restaurant) => void
  onToggleLike: (restaurant: Restaurant) => void
  onSelect: (restaurant: Restaurant) => void
}

// 항목을 이미지 카드 그리드로 렌더링 (홈/카테고리 화면 공용)
function RestaurantList({
  restaurants,
  onToggleFavorite,
  onToggleLike,
  onSelect,
}: Props) {
  if (restaurants.length === 0) {
    return <p className="empty">표시할 음식점이 없습니다.</p>
  }

  return (
    <ul className="rcard-grid">
      {restaurants.map((r) => (
        <li
          key={r.id}
          className="rcard"
          role="button"
          tabIndex={0}
          aria-label={`${r.name} 상세 보기`}
          onClick={() => onSelect(r)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(r)
            }
          }}
        >
          <div className="rcard-media">
            <div className="rcard-thumb">
              {/* 사진을 아직 등록하지 않은 항목은 자리 표시자 */}
              {r.image ? (
                <img src={r.image} alt={r.name} loading="lazy" />
              ) : (
                <div className="rcard-noimg" aria-hidden="true">
                  🍽
                </div>
              )}
            </div>

            <div className="rcard-fav">
              <FavoriteButton
                variant="icon"
                isFavorite={!!r.favoritedByMe}
                onToggle={() => onToggleFavorite(r)}
              />
            </div>

            {/* 별점 메달리온 — 사진 좌하단 경계에 걸침 */}
            <span className="rcard-rating">
              <span className="star">★</span>
              {formatRating(r)}
            </span>
          </div>

          <div className="rcard-body">
            <p className="rcard-cat">{r.category}</p>
            <h3 className="rcard-name">{r.name}</h3>
            {r.description && <p className="rcard-desc">{r.description}</p>}
            <div className="rcard-foot">
              <span className="rcard-meta">
                리뷰 {r.reviewCount.toLocaleString()}개
              </span>
              <LikeButton
                liked={!!r.likedByMe}
                count={r.likeCount ?? 0}
                onToggle={() => onToggleLike(r)}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default RestaurantList
