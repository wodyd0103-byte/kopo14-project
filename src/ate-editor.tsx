import { useState, type KeyboardEvent } from 'react'

interface Props {
  ate: string[]
  onChange: (ate: string[]) => void
}

// 그 가게에서 먹어 본 음식 편집기 (등록/수정 폼 공용).
// 가격까지 적는 메뉴판(MenuEditor)과 달리 이름만 받는다. 등록하다 말고 길게 입력할
// 일이 아니라서, 쉼표로 여러 개를 한 번에 넣고 Enter로 확정하게 했다.
function AteEditor({ ate, onChange }: Props) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const items = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (items.length === 0) return

    // 같은 음식을 두 번 담지 않는다
    const next = [...ate]
    for (const item of items) {
      if (!next.includes(item)) next.push(item)
    }
    onChange(next)
    setDraft('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 폼 안이라 Enter를 그냥 두면 등록이 submit된다
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  const remove = (target: string) => onChange(ate.filter((v) => v !== target))

  return (
    <div className="ate-editor">
      <span className="ate-editor-label">먹은 음식</span>
      <p className="ate-editor-hint">
        쉼표로 여러 개를 한 번에 적을 수 있어요. 예: 수육국밥, 냉면
      </p>

      {ate.length > 0 && (
        <ul className="ate-chips">
          {ate.map((item) => (
            <li key={item}>
              <span>{item}</span>
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`${item} 삭제`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ate-input-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          // 적어 놓고 추가를 안 누른 채 등록하는 일이 잦아 blur에서도 확정한다
          onBlur={commit}
          placeholder="무엇을 드셨나요?"
          aria-label="먹은 음식"
        />
        <button type="button" className="ate-add" onClick={commit}>
          추가
        </button>
      </div>
    </div>
  )
}

export default AteEditor
