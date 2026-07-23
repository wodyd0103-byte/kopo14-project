interface Props {
  liked: boolean
  count: number
  onToggle: () => void
}

// 사용자별 좋아요 버튼 (👍 + 개수). 찜 하트(♥)와 구분되는 별개 개념
// 클릭 시 카드 열림(모달)을 막기 위해 stopPropagation
export function LikeButton({ liked, count, onToggle }: Props) {
  return (
    <button
      type="button"
      className={liked ? 'like-btn active' : 'like-btn'}
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <span aria-hidden="true">👍</span>
      <span className="like-count">{count.toLocaleString()}</span>
    </button>
  )
}
