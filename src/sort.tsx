import type { SortKey } from './types'

interface Props {
  sortKey: SortKey
  onChange: (key: SortKey) => void
}

function SortTabs({ sortKey, onChange }: Props) {
  return (
    <div className="sort-tabs">
      <button
        type="button"
        className={sortKey === 'rating' ? 'active' : ''}
        onClick={() => onChange('rating')}
      >
        평점순
      </button>
      <button
        type="button"
        className={sortKey === 'reviewCount' ? 'active' : ''}
        onClick={() => onChange('reviewCount')}
      >
        리뷰많은순
      </button>
      <button
        type="button"
        className={sortKey === 'likeCount' ? 'active' : ''}
        onClick={() => onChange('likeCount')}
      >
        좋아요순
      </button>
    </div>
  )
}

export default SortTabs
