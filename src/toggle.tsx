interface FilterProps {
  onlyFavorites: boolean
  onChange: (value: boolean) => void
}

// "찜한 항목만 보기" 온/오프 필터
export function FavoriteFilter({ onlyFavorites, onChange }: FilterProps) {
  return (
    <label className="toggle-filter">
      <input
        type="checkbox"
        checked={onlyFavorites}
        onChange={(e) => onChange(e.target.checked)}
      />
      찜한 항목만 보기
    </label>
  )
}

interface ButtonProps {
  isFavorite: boolean
  onToggle: () => void
  // 'pill' = 텍스트 버튼(기본), 'icon' = 카드 위에 얹는 원형 하트
  variant?: 'pill' | 'icon'
}

// 항목별 찜 버튼 (클릭 시 상위로 토글 요청, 모달 열림 방지)
export function FavoriteButton({ isFavorite, onToggle, variant = 'pill' }: ButtonProps) {
  const base = variant === 'icon' ? 'fav-btn icon' : 'fav-btn'
  return (
    <button
      type="button"
      className={isFavorite ? `${base} active` : base}
      aria-pressed={isFavorite}
      aria-label={variant === 'icon' ? (isFavorite ? '찜 해제' : '찜하기') : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {variant === 'icon' ? '♥' : isFavorite ? '♥ 찜' : '♡ 찜'}
    </button>
  )
}
