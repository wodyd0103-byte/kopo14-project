import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import type { Restaurant, Review } from './types'
import { useAuth } from './auth-context'
import { useRestaurants } from './restaurant-context'
import { formatRating } from './stats'
import { LikeButton } from './like'
import DeleteRestaurant from './delete'
import LoginForm from './login-form'

interface Props {
  restaurant: Restaurant
  onClose: () => void
  onDeleted?: (id: number) => void
}

type ReviewForm = {
  rating: number
  comment: string
}

// 작성자는 로그인한 사람으로 정해진다. 예전에는 직접 입력받아서
// 남의 이름을 대고 리뷰를 남길 수 있었다.
const EMPTY_REVIEW: ReviewForm = { rating: 5, comment: '' }

// 항목 클릭 시 열리는 상세 모달 (음식점 정보 + 리뷰 목록/작성/삭제)
function Modal({ restaurant, onClose, onDeleted }: Props) {
  // 리뷰는 전역 스토어가 보관 — 등록/삭제 시 평점·리뷰수와 함께 갱신된다
  const { reviews: allReviews, addReview, removeReview, toggleLike } =
    useRestaurants()
  const { user } = useAuth()
  const [form, setForm] = useState<ReviewForm>(EMPTY_REVIEW)
  const [submitting, setSubmitting] = useState(false)

  // 등록자 본인만 수정·삭제.
  // 예전에는 ownerId가 없으면 누구에게나 열어 줬는데, 기존 데이터 대부분이
  // ownerId가 없어서 사실상 로그인한 아무나 남의 가게를 지울 수 있었다.
  const canManage = !!user && !!restaurant.ownerId && restaurant.ownerId === user.id

  const reviews = useMemo(
    () => allReviews.filter((v) => v.restaurantId === restaurant.id),
    [allReviews, restaurant.id],
  )

  // ESC 키로 닫기
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // 모달이 열려 있는 동안 배경 스크롤 잠금 (특히 모바일)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // 내용 입력 (문자열 필드)
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // 평점 선택 (숫자 필드)
  const handleRatingChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, rating: Number(e.target.value) }))
  }

  // 리뷰 등록 → 스토어가 평점/리뷰수까지 다시 계산
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      await addReview({
        restaurantId: restaurant.id,
        rating: form.rating,
        comment: form.comment.trim(),
        date: new Date().toISOString().slice(0, 10),
      })
      setForm(EMPTY_REVIEW)
    } catch (err) {
      alert(err instanceof Error ? err.message : '리뷰 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 리뷰 삭제 → 스토어가 평점/리뷰수까지 다시 계산
  const handleDeleteReview = async (review: Review) => {
    const ok = window.confirm('이 리뷰를 삭제할까요?')
    if (!ok) return

    try {
      await removeReview(review)
    } catch (err) {
      alert(err instanceof Error ? err.message : '리뷰 삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurant.name} 상세`}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          닫기 ✕
        </button>

        {/* 음식점 상세 정보 — 아직 채우지 않은 항목은 표시하지 않음 */}
        {restaurant.image && <img src={restaurant.image} alt={restaurant.name} />}
        <h2>{restaurant.name}</h2>
        <p className="category">{restaurant.category}</p>
        <p className="meta">
          ⭐ {formatRating(restaurant)} · 리뷰 {restaurant.reviewCount}개
        </p>
        <div className="modal-like">
          <LikeButton
            liked={!!restaurant.likedByMe}
            count={restaurant.likeCount ?? 0}
            onToggle={() => void toggleLike(restaurant)}
          />
        </div>
        {restaurant.ownerName && (
          <p className="owner">등록: {restaurant.ownerName}</p>
        )}
        {restaurant.description && (
          <p className="description">{restaurant.description}</p>
        )}
        {restaurant.address && <p className="address">📍 {restaurant.address}</p>}
        {restaurant.phone && <p className="phone">📞 {restaurant.phone}</p>}
        {restaurant.hours && <p className="hours">🕒 {restaurant.hours}</p>}
        {restaurant.link && (
          <p className="link">
            🔗{' '}
            <a href={restaurant.link} target="_blank" rel="noreferrer noopener">
              홈페이지 열기
            </a>
          </p>
        )}

        {/* 먹어 본 음식 — 메뉴판은 비어 있어도 이건 실제 기록이라 대개 채워져 있다 */}
        {restaurant.ate && restaurant.ate.length > 0 && (
          <>
            <h3>먹어 본 음식</h3>
            <ul className="ate-list">
              {restaurant.ate.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {/* 메뉴 — 직접 적어 둔 것만 표시 */}
        {restaurant.menu && restaurant.menu.length > 0 && (
          <>
            <h3>메뉴</h3>
            <ul className="menu-list">
              {restaurant.menu.map((item) => (
                <li key={item.name}>
                  <span className="menu-name">{item.name}</span>
                  {item.price && <span className="menu-price">{item.price}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {canManage && (
          <div className="modal-actions">
            <Link to={`/edit/${restaurant.id}`} className="edit-link">
              수정
            </Link>
            {onDeleted && (
              <DeleteRestaurant
                restaurant={restaurant}
                onDeleted={(id) => {
                  onDeleted(id)
                  onClose()
                }}
              />
            )}
          </div>
        )}

        {/* 리뷰 목록 (작성자 · 별점 · 내용) */}
        <h3>리뷰</h3>
        <ul className="review-list">
          {reviews.length === 0 && <li>등록된 리뷰가 없습니다.</li>}
          {reviews.map((review) => (
            <li key={review.id} className="review-item">
              <p className="review-head">
                <b>{review.author}</b> ⭐ {review.rating} · {review.date}
                {/* 내가 쓴 리뷰만 지울 수 있다. 작성자를 모르는 옛 리뷰는 아무도 못 지운다. */}
                {user && review.userId === user.id && (
                  <button
                    type="button"
                    className="review-delete"
                    onClick={() => handleDeleteReview(review)}
                  >
                    삭제
                  </button>
                )}
              </p>
              <p className="review-comment">{review.comment}</p>
            </li>
          ))}
        </ul>

        {/* 평점·리뷰 작성 폼 — 로그인 전에는 그 자리에서 바로 로그인할 수 있게 한다.
            모달을 닫고 헤더로 올라갔다 오게 만들 이유가 없다. */}
        {!user ? (
          <LoginForm variant="panel" note="리뷰를 남기려면 닉네임을 입력해 주세요." />
        ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          <h4>리뷰 작성</h4>
          {/* 이름을 고를 수 없다는 것을 분명히 보여 준다 */}
          <p className="review-as">
            <b>{user.nickname}</b>님 이름으로 올라갑니다.
          </p>
          <label>
            평점
            <select name="rating" value={form.rating} onChange={handleRatingChange}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}점
                </option>
              ))}
            </select>
          </label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="내용을 입력하세요"
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? '등록 중…' : '리뷰 등록'}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}

export default Modal
