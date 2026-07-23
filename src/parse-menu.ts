import type { MenuItem } from './types'

// 지도 앱이나 가게 홈페이지에서 '사람이 보고 복사한' 메뉴 글을 이름/가격 행으로 나눈다.
//
// 자동으로 긁어 오지 않는다. 네이버는 메뉴를 API로 주지 않고, 페이지를 프로그램으로
// 수집하는 것은 약관이 금지한다. 그래서 복사는 사람이 하고, 줄을 나눠 표로 만드는
// 지루한 일만 여기서 대신한다.
//
// 복사해 보면 형태가 제각각이라 아래 세 가지를 모두 받는다.
//   "수육국밥 9,000원"        한 줄에 이름과 가격
//   "수육국밥" / "9,000원"    이름 다음 줄에 가격
//   "수육국밥"                가격 없이 이름만

// 메뉴판을 긁어 복사하면 딸려 오는 군더더기 줄
const NOISE =
  /^(메뉴|메뉴판|가격|가격표|대표메뉴|대표|인기|신메뉴|추천|더보기|접기|사진|리뷰|주문|배달|포장|예약|원산지|영업시간|전화|위치|길찾기|공유|저장)$/

// 가게가 붙여 두는 안내 문구 (줄 전체가 이런 말이면 메뉴가 아니다)
const NOTICE = /(변동될 수|변경될 수|부가세|VAT|사진은 실제|참고용|문의)/

// 가격만 있는 줄인지. 숫자만 덜렁 있는 줄을 가격으로 오해하지 않도록
// '원'이 붙었거나, 천 단위 쉼표가 있거나, 네 자리 이상일 때만 인정한다.
const ONLY_PRICE = /^(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원$|^(\d{1,3}(?:,\d{3})+)$|^(\d{4,7})$/

// "이름 ... 12,000원" — 가격은 줄 끝에 온다.
// '원'을 안 붙이고 "돈까스 12000"이라고 적는 곳도 많아 원은 선택으로 둔다.
// 대신 원이 없으면 진짜 가격처럼 보일 때만(쉼표가 있거나 1000 이상) 인정한다.
const NAME_WITH_PRICE = /^(.*?)[\s.·~-]+(\d{1,3}(?:,\d{3})+|\d{3,7})\s*(원?)$/

// 이름이 이보다 길면 메뉴가 아니라 설명 문장일 가능성이 높다
const MAX_NAME = 40

function toPrice(digits: string): string {
  const n = Number(digits.replace(/,/g, ''))
  // 100원 미만은 가격이 아니라 순번이나 수량일 것이다
  if (!Number.isFinite(n) || n < 100) return ''
  return `${n.toLocaleString('ko-KR')}원`
}

export function parseMenuText(raw: string): MenuItem[] {
  const out: MenuItem[] = []

  for (const line of raw.split(/\r?\n/)) {
    // 목록 기호나 번호를 떼어낸다
    const text = line
      .trim()
      .replace(/^[-•*·▪◦]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim()

    if (!text || NOISE.test(text) || NOTICE.test(text)) continue

    // 가격만 있는 줄 → 바로 앞 메뉴의 가격으로 붙인다
    const onlyPrice = text.match(ONLY_PRICE)
    if (onlyPrice) {
      const digits = onlyPrice[1] ?? onlyPrice[2] ?? onlyPrice[3] ?? ''
      const last = out[out.length - 1]
      if (last && !last.price) last.price = toPrice(digits)
      continue
    }

    // 가격으로 인정받지 못한 숫자만 있는 줄은 메뉴가 아니다 (순번, 별점 등)
    if (/^\d+$/.test(text)) continue

    const withPrice = text.match(NAME_WITH_PRICE)
    if (withPrice) {
      const name = withPrice[1].trim()
      const digits = withPrice[2]
      const hasWon = withPrice[3] === '원'
      const value = Number(digits.replace(/,/g, ''))
      const looksLikePrice = hasWon || digits.includes(',') || value >= 1000

      const price = looksLikePrice ? toPrice(digits) : ''
      if (name && name.length <= MAX_NAME && price) {
        out.push({ name, price })
        continue
      }
    }

    if (text.length <= MAX_NAME) out.push({ name: text, price: '' })
  }

  // 같은 메뉴가 두 번 들어오면 (사진 목록과 글 목록이 함께 복사되는 경우) 하나만 남긴다
  const seen = new Set<string>()
  return out.filter((row) => {
    if (seen.has(row.name)) return false
    seen.add(row.name)
    return true
  })
}
