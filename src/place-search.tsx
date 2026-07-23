import { useState } from 'react'
import type { LatLng } from './types'

export interface SelectedPlace {
  name: string
  category: string
  address: string
  phone: string
  link: string
  location: LatLng | null
}

// 네이버 지역검색 응답 항목 중 쓰는 것만
interface NaverLocalItem {
  title: string
  link: string
  category: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
}

// 응답의 title에는 검색어 강조용 <b> 태그가 섞여 온다
function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

// 네이버 카테고리는 "음식점>한식" 또는 "한식>칼국수,만두" 두 형태로 온다.
// 카테고리 필터가 잘게 쪼개지지 않도록 큰 분류만 쓴다.
function broadCategory(raw: string): string {
  const parts = (raw ?? '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return ''
  return parts[0] === '음식점' ? (parts[1] ?? '') : parts[0]
}

// mapx/mapy → 위경도. 좌표계 표기가 자료마다 갈려서
// 변환 후 한국 범위를 벗어나면 좌표를 쓰지 않는다 (지도가 엉뚱한 곳으로 튀지 않도록)
function toLatLng(mapx: string, mapy: string): LatLng | null {
  const lng = Number(mapx) / 1e7
  const lat = Number(mapy) / 1e7
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null
  return { lat, lng }
}

interface Props {
  onSelect: (place: SelectedPlace) => void
}

// 상호로 가게를 찾아 이름·주소·전화·위치를 한 번에 채워 넣는 검색창
function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<NaverLocalItem[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q || searching) return

    setSearching(true)
    setMessage(null)

    try {
      const res = await fetch(`/naver-api/local.json?query=${encodeURIComponent(q)}&display=5`)
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? '네이버 API 키가 설정되지 않았습니다. .env를 채우고 개발 서버를 다시 시작해 주세요.'
            : `장소를 검색하지 못했습니다. (${res.status})`,
        )
      }

      const data: { items?: NaverLocalItem[] } = await res.json()
      const found = data.items ?? []

      setItems(found)
      if (found.length === 0) setMessage('검색 결과가 없습니다. 아래에 직접 입력해 주세요.')
    } catch (err) {
      setItems([])
      setMessage(err instanceof Error ? err.message : '장소 검색 중 오류가 발생했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (item: NaverLocalItem) => {
    onSelect({
      name: stripTags(item.title),
      category: broadCategory(item.category),
      address: item.roadAddress || item.address || '',
      phone: item.telephone ?? '',
      link: item.link ?? '',
      location: toLatLng(item.mapx, item.mapy),
    })
    setItems([])
    setMessage(`'${stripTags(item.title)}' 정보를 채웠습니다. 아래에서 고칠 수 있습니다.`)
  }

  return (
    <div className="place-search">
      <label>
        가게 이름으로 찾기
        <span className="place-search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예) 서현칼국수"
            // form 안이라 Enter가 폼 제출로 새지 않도록 직접 처리
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
          <button type="button" onClick={handleSearch} disabled={searching}>
            {searching ? '찾는 중…' : '검색'}
          </button>
        </span>
      </label>

      {items.length > 0 && (
        <ul className="place-results">
          {items.map((item) => (
            <li key={`${item.title}-${item.mapx}-${item.mapy}`}>
              <button type="button" onClick={() => handleSelect(item)}>
                <b>{stripTags(item.title)}</b>
                <span>{item.roadAddress || item.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="place-search-message">{message}</p>}
    </div>
  )
}

export default PlaceSearch
