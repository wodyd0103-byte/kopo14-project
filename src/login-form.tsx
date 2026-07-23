import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from './auth-context'
import { registerLoginForm } from './login-focus'

interface Props {
  // 'bar'   = 헤더 구석에 놓는 한 줄짜리 (평소 모습)
  // 'panel' = 리뷰 폼·등록 화면 자리에 놓는, 안내가 딸린 블록
  variant?: 'bar' | 'panel'
  note?: string
}

// 닉네임 하나로 들어가는 로그인 폼. 화면을 가리지 않고 필요한 자리에 놓는다.
function LoginForm({ variant = 'bar', note }: Props) {
  const { login } = useAuth()
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const unregister = registerLoginForm(() => {
      inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      inputRef.current?.focus()
      // 눌렀는데 아무 일도 안 일어난 것처럼 보이지 않도록 잠깐 강조한다
      setFlash(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFlash(false), 1200)
    })

    return () => {
      window.clearTimeout(timer.current)
      unregister()
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(nickname)
      setNickname('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className={`login-form ${variant}${flash ? ' flash' : ''}`}
      onSubmit={handleSubmit}
    >
      {note && <p className="login-note">{note}</p>}
      <div className="login-row">
        <input
          ref={inputRef}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          aria-label="닉네임"
          maxLength={20}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? '…' : variant === 'bar' ? '시작' : '시작하기'}
        </button>
      </div>
    </form>
  )
}

export default LoginForm
