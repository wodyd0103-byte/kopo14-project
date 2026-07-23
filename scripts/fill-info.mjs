// db.json의 음식점 정보를 네이버 검색 API로 채우는 1회용 스크립트
//
//   npm run fill-info             비어 있는 항목만 채움 (사진 제외)
//   npm run fill-info -- --images 사진도 함께 채움 (검색 결과라 검수 필요)
//   npm run fill-info -- --force  이미 값이 있어도 덮어씀
//   npm run fill-info -- --dry    db.json을 건드리지 않고 결과만 출력
//
// 브라우저가 아니라 Node에서 실행하므로 CORS 문제가 없고, 시크릿 키도 노출되지 않는다.
// 실행 전 json-server(npm start)는 꺼두는 편이 안전하다. (같은 파일을 동시에 쓰지 않도록)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = path.join(ROOT, 'db.json')
const REPORT_PATH = path.join(ROOT, 'scripts', 'fill-info-report.json')

const FORCE = process.argv.includes('--force')
const DRY = process.argv.includes('--dry')
// 사진은 검색 결과가 엉뚱한 경우가 많아 사람이 골라야 한다.
// 기본으로 건드리지 않고(일부러 비워 둔 사진이 되살아나지 않도록) 요청할 때만 채운다.
// 후보 목록은 이 플래그와 무관하게 항상 리포트에 남는다.
const WITH_IMAGES = process.argv.includes('--images')

// 이 앱이 다루는 지역(서현역)과 허용 반경.
// 상호만 비슷하고 동네가 전혀 다른 결과를 걸러내는 데 쓴다.
// (예: "우체국" → 서울 광화문우체국)
const BASE = { lat: 37.3853, lng: 127.1234 }
const MAX_KM = 3

// --- .env 읽기 (의존성 없이) ---------------------------------------------
function loadEnv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...loadEnv(path.join(ROOT, '.env')), ...process.env }
const CLIENT_ID = env.NAVER_CLIENT_ID
const CLIENT_SECRET = env.NAVER_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '\n네이버 API 키가 없습니다.\n' +
      '  1) .env.example을 복사해 .env를 만드세요\n' +
      '  2) developers.naver.com에서 애플리케이션을 등록하고 "검색" API를 추가하세요\n' +
      '  3) 발급받은 Client ID / Secret을 .env에 넣으세요\n',
  )
  process.exit(1)
}

// --- 네이버 API 호출 -------------------------------------------------------
const HEADERS = {
  'X-Naver-Client-Id': CLIENT_ID,
  'X-Naver-Client-Secret': CLIENT_SECRET,
}

async function callNaver(endpoint, params) {
  const url = `https://openapi.naver.com/v1/search/${endpoint}?${new URLSearchParams(params)}`
  const res = await fetch(url, { headers: HEADERS })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${endpoint} ${res.status} ${res.statusText} ${body}`)
  }
  return res.json()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// --- 유틸 -----------------------------------------------------------------

// 네이버 응답의 title에는 <b> 태그가 섞여 온다
function stripTags(text) {
  return String(text ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

const normalize = (text) => text.replace(/\s+/g, '').toLowerCase()

// 검색 결과가 우리가 찾던 가게가 맞는지 대략 판단 (엉뚱한 가게 자동 입력 방지)
function looksLikeSameStore(wanted, found) {
  const a = normalize(wanted)
  const b = normalize(found)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true

  const shared = [...new Set(a)].filter((ch) => b.includes(ch)).length
  return shared / new Set(a).size >= 0.7
}

// 네이버 카테고리는 "음식점>한식" 또는 "한식>칼국수,만두" 두 형태로 온다.
// 카테고리 필터가 잘게 쪼개지지 않도록 큰 분류만 뽑는다.
function broadCategory(raw) {
  const parts = String(raw ?? '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null
  return parts[0] === '음식점' ? (parts[1] ?? null) : parts[0]
}

// mapx/mapy → 위경도.
// 좌표계 표기가 자료마다 갈려서(WGS84×10^7 / KATEC) 값을 변환한 뒤
// 한국 범위 안에 들어오는지 검증하고, 벗어나면 채우지 않는다.
function toLatLng(mapx, mapy) {
  const x = Number(mapx)
  const y = Number(mapy)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const lng = x / 1e7
  const lat = y / 1e7
  const inKorea = lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132
  if (!inKorea) return null

  return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) }
}

// 음식점이 아닌 업종은 자동으로 채우지 않는다.
// (예: "우체국"으로 검색하면 진짜 우체국이 잡힌다)
const NON_FOOD = /기관|관공서|병원|약국|학교|은행|마트|편의점|숙박|주유소|부동산|미용/

function isFoodPlace(category) {
  return !NON_FOOD.test(String(category ?? ''))
}

// 두 좌표 사이 거리(km). 짧은 거리라 위경도 근사로 충분하다.
function distanceKm(a, b) {
  const dy = (a.lat - b.lat) * 111
  const dx = (a.lng - b.lng) * 88.8
  return Math.hypot(dx, dy)
}

// --- 가게 한 곳 처리 -------------------------------------------------------
async function fetchPlace(name) {
  // 검색어를 여러 형태로 시도한다.
  //  - 공백을 뺀 형태: 띄어쓰기가 다르면 0건이 나오는 경우가 있다
  //    (예: "온담 숯불국수" 0건 → "온담숯불국수" 1건)
  //  - 지역명을 붙인 형태: 상호에 지역이 없으면 다른 지점이 잡힌다
  const compact = name.replace(/\s+/g, '')
  const queries = [name]
  if (compact !== name) queries.push(compact)
  if (!/서현|분당/.test(name)) queries.push(`서현 ${name}`)

  for (const query of queries) {
    const data = await callNaver('local.json', { query, display: 5 })
    await sleep(120)

    for (const item of data.items ?? []) {
      const title = stripTags(item.title)
      if (!looksLikeSameStore(name, title)) continue
      if (!isFoodPlace(item.category)) continue

      // 이름이 비슷해도 동네가 다르면 다른 가게다
      const coords = toLatLng(item.mapx, item.mapy)
      if (coords && distanceKm(coords, BASE) > MAX_KM) continue

      return { ...item, title }
    }
    // 이름이 안 맞으면 다음 쿼리로
  }
  return null
}

async function fetchImages(name) {
  const data = await callNaver('image', { query: name, display: 10, sort: 'sim' })
  await sleep(120)

  return (data.items ?? [])
    .filter((item) => Number(item.sizewidth) >= 400)
    .slice(0, 5)
    .map((item) => ({ title: stripTags(item.title), url: item.link, thumbnail: item.thumbnail }))
}

// 가게 설명·메뉴를 적을 때 참고할 블로그 글을 모아 둔다.
// (네이버는 메뉴를 API로 주지 않으므로 자동 입력 대신 '읽을거리'로만 쓴다)
async function fetchBlogRefs(name) {
  const data = await callNaver('blog.json', { query: name, display: 3, sort: 'sim' })
  await sleep(120)

  return (data.items ?? []).map((item) => ({
    title: stripTags(item.title),
    url: item.link,
    summary: stripTags(item.description),
  }))
}

// --- 메인 -----------------------------------------------------------------
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
const report = []

console.log(`\n음식점 ${db.restaurants.length}곳 처리 시작${DRY ? ' (dry run)' : ''}\n`)

for (const restaurant of db.restaurants) {
  const entry = { name: restaurant.name, filled: [], images: [], blogs: [], note: null }

  try {
    const place = await fetchPlace(restaurant.name)

    if (!place) {
      entry.note = '검색 결과에서 같은 상호를 찾지 못했습니다 (직접 입력 필요)'
    } else {
      const fill = (field, value) => {
        if (value === null || value === undefined || value === '') return
        const current = restaurant[field]
        const isEmpty = current === '' || current === null || current === undefined
        if (!FORCE && !isEmpty) return
        restaurant[field] = value
        entry.filled.push(field)
      }

      fill('address', place.roadAddress || place.address)
      fill('phone', place.telephone || null)
      fill('description', stripTags(place.description) || null)
      fill('location', toLatLng(place.mapx, place.mapy))
      fill('link', place.link || null) // 홈페이지·SNS 주소

      if (!toLatLng(place.mapx, place.mapy)) {
        entry.note = '좌표가 예상 범위를 벗어나 채우지 않았습니다'
      }

      // 카테고리는 '미분류'로 남겨둔 곳만 채운다 (직접 정한 분류를 덮지 않도록)
      const broad = broadCategory(place.category)
      if (broad && (FORCE || restaurant.category === '미분류')) {
        restaurant.category = broad
        entry.filled.push('category')
      }
      entry.naverCategory = place.category ?? null
    }

    entry.blogs = await fetchBlogRefs(restaurant.name)
    entry.images = await fetchImages(restaurant.name)
    if (WITH_IMAGES && entry.images.length > 0 && (FORCE || !restaurant.image)) {
      restaurant.image = entry.images[0].url
      entry.filled.push('image')
    }
  } catch (err) {
    entry.note = `오류: ${err.message}`
  }

  report.push(entry)
  const status = entry.note ? `⚠ ${entry.note}` : `채움: ${entry.filled.join(', ') || '없음'}`
  console.log(`  ${restaurant.name} — ${status}`)
}

if (!DRY) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
}

const failed = report.filter((r) => r.note).length
console.log(
  `\n완료. ${report.length - failed}곳 성공, ${failed}곳 확인 필요.` +
    (DRY ? '\n(dry run이라 db.json은 그대로입니다)' : `\n사진 후보·블로그 참고글: ${REPORT_PATH}`) +
    '\n\n사진은 이미지 검색 결과라 엉뚱한 가게가 섞일 수 있습니다.' +
    '\n앱의 수정 화면에서 미리보기로 확인하고, 아니면 위 후보 목록의 다른 주소로 바꿔 주세요.' +
    '\n\n메뉴는 네이버가 API로 주지 않습니다. 리포트의 블로그 글을 참고해' +
    '\n앱의 수정 화면에서 직접 적어 주세요.\n',
)
