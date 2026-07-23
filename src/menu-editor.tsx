import { useState } from 'react'
import type { MenuItem } from './types'
import { parseMenuText } from './parse-menu'

interface Props {
  menu: MenuItem[]
  onChange: (menu: MenuItem[]) => void
}

const EMPTY_ROW: MenuItem = { name: '', price: '' }

// 메뉴 목록 편집기 (등록/수정 폼 공용)
// 네이버가 메뉴를 API로 주지 않아 직접 적는다.
// 한 줄씩 치기는 번거로워서, 지도 앱이나 가게 홈페이지에서 보고 복사한 글을
// 통째로 붙여넣으면 줄을 나눠 채우는 길도 함께 둔다.
function MenuEditor({ menu, onChange }: Props) {
  const [pasting, setPasting] = useState(false)
  const [draft, setDraft] = useState('')

  const update = (index: number, field: keyof MenuItem, value: string) => {
    onChange(menu.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const addRow = () => onChange([...menu, { ...EMPTY_ROW }])
  const removeRow = (index: number) => onChange(menu.filter((_, i) => i !== index))

  const applyPaste = () => {
    const parsed = parseMenuText(draft)
    if (parsed.length === 0) {
      alert('메뉴로 보이는 줄을 찾지 못했습니다. 붙여넣은 내용을 확인해 주세요.')
      return
    }
    // 이미 적어 둔 줄은 그대로 두고 뒤에 붙인다. 빈 줄만 있으면 그건 걷어낸다.
    const kept = menu.filter((row) => row.name.trim() !== '')
    const names = new Set(kept.map((row) => row.name))
    onChange([...kept, ...parsed.filter((row) => !names.has(row.name))])
    setDraft('')
    setPasting(false)
  }

  return (
    <div className="menu-editor">
      <span className="menu-editor-label">메뉴</span>

      {menu.length === 0 && !pasting && (
        <p className="menu-editor-empty">아직 적은 메뉴가 없습니다.</p>
      )}

      <ul className="menu-rows">
        {menu.map((row, index) => (
          // 입력 중 순서가 바뀌지 않으므로 index를 키로 써도 안전하다
          <li key={index}>
            <input
              value={row.name}
              onChange={(e) => update(index, 'name', e.target.value)}
              placeholder="메뉴 이름"
              aria-label={`메뉴 ${index + 1} 이름`}
            />
            <input
              value={row.price}
              onChange={(e) => update(index, 'price', e.target.value)}
              placeholder="가격 (예: 9,000원)"
              aria-label={`메뉴 ${index + 1} 가격`}
            />
            <button
              type="button"
              className="menu-row-remove"
              onClick={() => removeRow(index)}
              aria-label={`메뉴 ${index + 1} 삭제`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {pasting ? (
        <div className="menu-paste">
          <p className="menu-paste-hint">
            지도 앱이나 가게 홈페이지에서 메뉴 부분을 복사해 그대로 붙여넣으세요.
            <br />
            줄마다 이름과 가격을 알아서 나눕니다. 나눈 뒤 고칠 수 있어요.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder={'수육국밥 9,000원\n직화구이냉면 10,000원'}
            aria-label="메뉴 붙여넣기"
            autoFocus
          />
          <div className="menu-paste-actions">
            <button type="button" className="menu-row-add" onClick={applyPaste}>
              나누기
            </button>
            <button
              type="button"
              className="menu-row-add"
              onClick={() => {
                setDraft('')
                setPasting(false)
              }}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="menu-paste-actions">
          <button type="button" className="menu-row-add" onClick={addRow}>
            + 메뉴 추가
          </button>
          <button
            type="button"
            className="menu-row-add"
            onClick={() => setPasting(true)}
          >
            붙여넣기로 한 번에
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuEditor
