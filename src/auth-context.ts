import { createContext, useContext } from 'react'
import type { User } from './types'

// 로그인 상태와 조작 함수 (닉네임 기반)
export interface AuthStore {
  user: User | null
  // 로그인하지 않고 둘러보기를 고른 상태. user와 guest가 모두 비어 있으면 로그인 화면이 뜬다.
  guest: boolean
  login: (nickname: string) => Promise<void>
  logout: () => void
  browseAsGuest: () => void
  // 로그인이 필요한 동작을 만났을 때 호출한다.
  // 둘러보기를 끝내는 것만으로 로그인 화면이 나오므로 따로 이동시킬 필요가 없다.
  requireLogin: () => void
}

export const AuthContext = createContext<AuthStore | null>(null)

// Provider 안에서만 사용하는 접근용 훅
export function useAuth(): AuthStore {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  }
  return ctx
}
