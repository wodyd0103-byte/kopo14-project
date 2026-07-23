interface Props {
  value: string
  onChange: (value: string) => void
}

// 목록 위에 놓는 검색창. 이름뿐 아니라 카테고리·메뉴·먹은 음식까지 훑는다.
function SearchBox({ value, onChange }: Props) {
  return (
    <div className="search-box">
      <span className="search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="가게 이름, 종류, 메뉴로 찾기"
        aria-label="가게 검색"
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default SearchBox
