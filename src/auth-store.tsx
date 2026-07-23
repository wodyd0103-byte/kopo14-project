import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from './types'
import { API_URL } from './types'
import { AuthContext } from './auth-context'

const STORAGE_KEY = 'kopo14:user'
const GUEST_KEY = 'kopo14:guest'

// 브라우저에 저장해 둔 로그인 상태를 복원 (없으면 null)
function readStored(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

// 둘러보기를 골랐던 사람이 새로고침했을 때 로그인 화면으로 되돌아가지 않도록 기억해 둔다
function readStoredGuest(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

interface Props {
  children: ReactNode
}

// 닉네임 로그인 Provider — 실제 보안 인증이 아니라 '누구인지' 구분이 목적
function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(readStored)
  const [guest, setGuest] = useState<boolean>(readStoredGuest)

  const login = useCallback(async (nicknameRaw: string) => {
    const nickname = nicknameRaw.trim()
    if (!nickname) throw new Error('닉네임을 입력해 주세요.')

    // 같은 닉네임이 이미 있으면 그 계정을 재사용, 없으면 새로 만든다
    const res = await fetch(
      `${API_URL}/users?nickname=${encodeURIComponent(nickname)}`,
    )
    if (!res.ok) throw new Error('로그인에 실패했습니다.')
    const found: User[] = await res.json()

    let account = found[0]
    if (!account) {
      const created = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      if (!created.ok) throw new Error('로그인에 실패했습니다.')
      account = await created.json()
    }

    setUser(account)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))

    // 둘러보다가 로그인한 경우 — 이제 손님이 아니다
    setGuest(false)
    localStorage.removeItem(GUEST_KEY)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    // 로그아웃하면 둘러보기도 함께 끝내 로그인 화면으로 돌아간다
    setGuest(false)
    localStorage.removeItem(GUEST_KEY)
  }, [])

  const browseAsGuest = useCallback(() => {
    setGuest(true)
    localStorage.setItem(GUEST_KEY, '1')
  }, [])

  // 둘러보기를 끝내면 App이 로그인 화면을 보여준다.
  // 주소는 그대로라 로그인하면 보던 곳으로 돌아온다.
  const requireLogin = useCallback(() => {
    setGuest(false)
    localStorage.removeItem(GUEST_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, guest, login, logout, browseAsGuest, requireLogin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
