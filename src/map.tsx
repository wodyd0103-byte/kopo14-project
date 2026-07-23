import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useRestaurants } from './restaurant-context'
import { matchesQuery } from './search'
import { formatRating } from './stats'
import SearchBox from './search-box'
import Modal from './modal'

// Leaflet 기본 마커는 CSS가 이미지를 상대경로로 찾는다. 번들을 거치면 그 경로가
// 어긋나 마커가 안 보이므로, 번들러가 만든 실제 주소를 직접 알려 준다.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// 가게들이 모여 있는 서현역. 좌표가 하나도 없을 때 여기서 시작한다.
const CENTER: [number, number] = [37.3853, 127.1234]

// 지도 화면 — 등록할 때 이미 좌표를 받아 두고 있어서 따로 모을 자료가 없다.
// 지도 라이브러리는 Leaflet, 배경 타일은 OpenStreetMap이라 API 키가 필요 없다.
function MapPage() {
  const { restaurants, reload } = useRestaurants()
  const [query, setQuery] = useState('')

  const [params, setParams] = useSearchParams()
  const selectedId = Number(params.get('r')) || null

  const holder = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.MarkerClusterGroup | null>(null)

  const shown = restaurants.filter(
    (r) => r.location && matchesQuery(r, query),
  )
  const missing = restaurants.length - restaurants.filter((r) => r.location).length

  // 지도는 한 번만 만든다. 다시 만들면 보고 있던 위치가 초기화된다.
  useEffect(() => {
    if (!holder.current || map.current) return

    map.current = L.map(holder.current).setView(CENTER, 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map.current)
    // 가게가 서현역 반경에 몰려 있어 기본 배율에서는 표시가 서로 겹친다.
    // (재 보니 23개 중 19개가 다른 표시에 가렸다) 겹치는 것들을 숫자로 묶고,
    // 누르면 그만큼 확대해 흩어 준다.
    layer.current = L.markerClusterGroup({
      maxClusterRadius: 45,
      showCoverageOnHover: false,
    }).addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
      layer.current = null
    }
  }, [])

  // 목록이 바뀌면 표시만 다시 찍는다
  useEffect(() => {
    if (!map.current || !layer.current) return
    layer.current.clearLayers()

    for (const r of shown) {
      if (!r.location) continue

      const marker = L.marker([r.location.lat, r.location.lng])
      marker.bindTooltip(r.name, { direction: 'top' })
      marker.on('click', () => {
        const next = new URLSearchParams(params)
        next.set('r', String(r.id))
        setParams(next)
      })
      layer.current.addLayer(marker)
    }

    // 보이는 가게가 다 들어오게 맞춘다. 처음 들어왔을 때와 검색으로 좁혔을 때 모두다.
    // 10초마다 도는 폴링으로는 목록이 그대로라 이 effect가 다시 돌지 않는다.
    // 그래서 지도를 옮겨 놓고 보는 중에 화면이 튀지 않는다.
    if (shown.length > 0) {
      const bounds = L.latLngBounds(
        shown.map((r) => [r.location!.lat, r.location!.lng] as [number, number]),
      )
      map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
    }
    // params/setParams는 클릭 시점에만 쓰이므로 의존성에서 뺀다 — 넣으면 모달을
    // 열 때마다 표시를 다시 찍는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.map((r) => r.id).join(','), query])

  const selected = restaurants.find((r) => r.id === selectedId) ?? null

  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('r')
    setParams(next)
  }

  return (
    <div className="map-page">
      <SearchBox value={query} onChange={setQuery} />

      <p className="result-count">
        지도에 {shown.length}곳
        {missing > 0 && ` · 좌표 없는 ${missing}곳은 표시되지 않습니다`}
      </p>

      <div className="map-holder" ref={holder} />

      {shown.length > 0 && (
        <ul className="map-legend">
          {/* 표시가 겹쳐 누르기 어려울 때를 위한 대신 누를 목록. 자르지 않는다 */}
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('r', String(r.id))
                  setParams(next)
                }}
              >
                <b>{r.name}</b>
                <span>
                  ★ {formatRating(r)} · {r.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Modal restaurant={selected} onClose={close} onDeleted={reload} />
      )}
    </div>
  )
}

export default MapPage
