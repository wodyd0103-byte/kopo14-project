// 소유권과 찜을 사람별로 바꾸는 1회용 이전 스크립트
//
//   node scripts/migrate-ownership.mjs                    db.json을 고친다
//   node scripts/migrate-ownership.mjs --api http://…     돌아가는 서버에 적용한다
//   node scripts/migrate-ownership.mjs --dry              바꾸지 않고 결과만 본다
//
// 왜 필요한가
//   - 가게에 등록자(ownerId)가 없으면 수정·삭제를 아무에게도 열어 주지 않게 바뀌었다.
//     기존 항목에 등록자를 넣어 주지 않으면 주인이 자기 가게를 못 고친다.
//   - 리뷰에 userId가 없으면 본인 리뷰인지 알 수 없어 지울 수 없다.
//   - 찜이 가게 레코드의 isFavorite 한 칸에서 favorites 컬렉션으로 옮겨졌다.
//
// 누구 것으로 넣는가
//   리뷰 작성자 이름을 users와 맞춰 본다. 맞는 사람이 없으면 --owner로 지정한 사람,
//   그것도 없으면 사용자가 한 명뿐일 때 그 사람으로 한다. 애매하면 건드리지 않는다.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = path.join(ROOT, 'db.json')

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const apiIndex = argv.indexOf('--api')
const API = apiIndex !== -1 ? argv[apiIndex + 1]?.replace(/\/$/, '') : null
const ownerIndex = argv.indexOf('--owner')
const OWNER_NICK = ownerIndex !== -1 ? argv[ownerIndex + 1] : null

// --- 읽기 ---------------------------------------------------------------
async function loadFromApi() {
  const names = ['restaurants', 'reviews', 'users', 'favorites']
  const out = {}
  for (const name of names) {
    const res = await fetch(`${API}/${name}`)
    // favorites 컬렉션은 아직 없을 수 있다 (이전 전이라면)
    if (!res.ok) {
      if (name === 'favorites') {
        out[name] = []
        continue
      }
      throw new Error(`${name} 조회 실패: ${res.status}`)
    }
    out[name] = await res.json()
  }
  return out
}

function loadFromFile() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  return { db, ...db, favorites: db.favorites ?? [] }
}

// --- 누구 것인지 정하기 --------------------------------------------------
function resolveOwner(users, reviews) {
  if (OWNER_NICK) {
    const found = users.find((u) => u.nickname === OWNER_NICK)
    if (!found) throw new Error(`'${OWNER_NICK}' 사용자를 찾을 수 없습니다.`)
    return found
  }
  if (users.length === 1) return users[0]

  // 리뷰를 가장 많이 쓴 사람을 후보로 본다
  const count = new Map()
  for (const r of reviews) {
    count.set(r.author, (count.get(r.author) ?? 0) + 1)
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]
  const found = top && users.find((u) => u.nickname === top[0])
  if (!found) {
    throw new Error(
      '주인을 정할 수 없습니다. --owner <닉네임> 으로 지정해 주세요.',
    )
  }
  return found
}

// --- 메인 ---------------------------------------------------------------
const data = API ? await loadFromApi() : loadFromFile()
const { restaurants, reviews, users } = data
const favorites = data.favorites ?? []

const owner = resolveOwner(users, reviews)
const byNickname = new Map(users.map((u) => [u.nickname, u]))

console.log(`\n대상: ${API ?? DB_PATH}`)
console.log(`기본 주인: ${owner.nickname} (id ${owner.id})\n`)

const plan = { owners: [], reviewUsers: [], favorites: [] }

for (const r of restaurants) {
  if (!r.ownerId) {
    plan.owners.push(r)
  }
  // isFavorite이 켜져 있던 가게는 주인의 찜으로 옮긴다
  if (r.isFavorite) {
    const already = favorites.some(
      (f) => f.userId === owner.id && f.restaurantId === r.id,
    )
    if (!already) plan.favorites.push(r)
  }
}

for (const v of reviews) {
  if (v.userId === undefined || v.userId === null) {
    // 작성자 이름과 같은 사용자가 있으면 그 사람, 없으면 기본 주인
    const matched = byNickname.get(v.author) ?? owner
    plan.reviewUsers.push({ review: v, user: matched })
  }
}

console.log(`등록자 채울 가게 : ${plan.owners.length}곳`)
console.log(`userId 채울 리뷰 : ${plan.reviewUsers.length}건`)
console.log(`옮길 찜          : ${plan.favorites.length}건`)

if (DRY) {
  console.log('\n--dry 라서 아무것도 바꾸지 않았습니다.\n')
  process.exit(0)
}

// --- 쓰기 ---------------------------------------------------------------
let nextFavoriteId =
  favorites.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0) + 1

if (API) {
  for (const r of plan.owners) {
    const res = await fetch(`${API}/restaurants/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: owner.id, ownerName: owner.nickname }),
    })
    if (!res.ok) throw new Error(`가게 ${r.id} 갱신 실패: ${res.status}`)
  }

  for (const { review, user } of plan.reviewUsers) {
    const res = await fetch(`${API}/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    if (!res.ok) throw new Error(`리뷰 ${review.id} 갱신 실패: ${res.status}`)
  }

  for (const r of plan.favorites) {
    const res = await fetch(`${API}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: owner.id, restaurantId: r.id }),
    })
    if (!res.ok) throw new Error(`찜 이전 실패: ${res.status}`)
  }

  // isFavorite은 더 이상 쓰지 않는다. 남겨 두면 옛 값이 헷갈린다.
  for (const r of restaurants) {
    if ('isFavorite' in r) {
      // json-server는 PATCH로 필드를 지울 수 없어 PUT으로 통째로 넣는다
      const { isFavorite: _drop, ...rest } = r
      const owned = plan.owners.includes(r)
        ? { ownerId: owner.id, ownerName: owner.nickname }
        : {}
      const res = await fetch(`${API}/restaurants/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, ...owned }),
      })
      if (!res.ok) throw new Error(`가게 ${r.id} 정리 실패: ${res.status}`)
    }
  }
} else {
  const db = data.db

  for (const r of plan.owners) {
    r.ownerId = owner.id
    r.ownerName = owner.nickname
  }
  for (const { review, user } of plan.reviewUsers) {
    review.userId = user.id
  }
  for (const r of plan.favorites) {
    favorites.push({
      id: nextFavoriteId++,
      userId: owner.id,
      restaurantId: r.id,
    })
  }
  for (const r of db.restaurants) {
    delete r.isFavorite
  }

  db.favorites = favorites
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

console.log('\n완료.\n')
