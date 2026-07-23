import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from './types'
import { API_URL } from './types'
import { AuthContext } from './auth-context'

const STORAGE_KEY = 'kopo14:user'

// 브라우저에 저장해 둔 로그인 상태를 복원 (없으면 null)
function readStored(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

interface Props {
  children: ReactNode
}

// 닉네임 로그인 Provider — 실제 보안 인증이 아니라 '누구인지' 구분이 목적
function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(readStored)

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
  }, [])

  // 로그아웃해도 보던 화면은 그대로다. 쓸 수 있느냐만 바뀐다.
  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
