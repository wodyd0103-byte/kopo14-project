import type { MenuItem } from './types'

interface Props {
  menu: MenuItem[]
  onChange: (menu: MenuItem[]) => void
}

const EMPTY_ROW: MenuItem = { name: '', price: '' }

// 메뉴 목록 편집기 (등록/수정 폼 공용)
// 네이버가 메뉴를 API로 주지 않아 직접 적는다.
function MenuEditor({ menu, onChange }: Props) {
  const update = (index: number, field: keyof MenuItem, value: string) => {
    onChange(menu.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const addRow = () => onChange([...menu, { ...EMPTY_ROW }])
  const removeRow = (index: number) => onChange(menu.filter((_, i) => i !== index))

  return (
    <div className="menu-editor">
      <span className="menu-editor-label">메뉴</span>

      {menu.length === 0 && (
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

      <button type="button" className="menu-row-add" onClick={addRow}>
        + 메뉴 추가
      </button>
    </div>
  )
}

export default MenuEditor
