export interface LatLng {
  lat: number
  lng: number
}

// 메뉴 한 줄. 가격은 '8,000원' / '시가'처럼 자유롭게 적을 수 있도록 문자열
export interface MenuItem {
  name: string
  price: string
}

export interface Restaurant {
  id: number
  name: string
  category: string
  description: string
  address: string
  location: LatLng | null
  rating: number
  reviewCount: number
  phone: string | null
  hours: string | null
  image: string
  link: string // 홈페이지·SNS 주소 (네이버 지역검색이 알려주는 값)
  menu: MenuItem[]
  // 등록한 사람이 그 가게에서 먹어 본 음식.
  // menu가 '가게에 이런 게 판다'는 가격표라면, 이쪽은 '내가 이걸 먹었다'는 기록이다.
  // 네이버가 메뉴를 API로 주지 않아 menu는 대부분 비어 있는데, 이건 실제로 먹은 것이라
  // 채워질수록 그 자체가 쓸모 있는 메뉴 목록이 된다.
  ate?: string[]
  ownerId?: number | null // 등록자 user id (없으면 아무도 수정·삭제할 수 없다)
  ownerName?: string // 등록자 닉네임 (표시용)
  // 아래는 likes/favorites 컬렉션에서 계산해 채우는 파생값 — 레코드에는 저장하지 않는다
  likeCount?: number
  likedByMe?: boolean
  favoritedByMe?: boolean
}

export interface Review {
  id: number
  restaurantId: number
  // 누가 썼는지. 이게 있어야 본인 리뷰만 지울 수 있다.
  // 없는 리뷰는 주인을 알 수 없으므로 아무도 지우지 못한다.
  userId?: number | null
  author: string
  rating: number
  comment: string
  date: string
}

// 로그인한 사용자 (닉네임만)
export interface User {
  id: number
  nickname: string
}

// 사용자별 좋아요 한 건 (userId × restaurantId 조합이 곧 '누가 무엇을 눌렀나')
export interface Like {
  id: number
  userId: number
  restaurantId: number
}

// 사용자별 찜 한 건. 좋아요와 구조가 같다.
// 예전에는 가게 레코드의 isFavorite 한 칸을 모두가 함께 고쳐서, 한 사람이 찜하면
// 다른 사람 화면에서도 찜으로 보였다. 그래서 좋아요와 같은 방식으로 떼어냈다.
export interface Favorite {
  id: number
  userId: number
  restaurantId: number
}

// 리뷰에서 파생되는 통계 (음식점 레코드에 반영되는 값)
export interface RestaurantStats {
  rating: number
  reviewCount: number
}

export type SortKey = 'rating' | 'reviewCount' | 'likeCount'

// API는 페이지와 같은 출처의 /api로 부른다. 뒤를 누가 받느냐만 환경마다 다르다.
// 개발 서버는 vite.config.ts의 프록시가, 배포 환경은 nginx가 json-server로 넘긴다.
// (호스트와 포트를 코드에 박지 않아야 다른 기기 접속도, https 배포도 그대로 된다)
export const API_URL = '/api'
