import { createContext, useContext } from 'react'
import type { User } from './types'

// 로그인 상태와 조작 함수 (닉네임 기반)
export interface AuthStore {
  user: User | null
  login: (nickname: string) => Promise<void>
  logout: () => void
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
