import { useAuth } from './auth-context'

interface Props {
  // 무엇을 하려면 로그인이 필요한지 (예: '리뷰를 남기려면')
  action: string
}

// 로그인이 필요한 자리에 폼 대신 놓는 안내.
// 버튼을 누르면 둘러보기가 끝나면서 로그인 화면이 나온다. 주소는 그대로라
// 로그인하고 나면 보던 자리로 돌아온다.
function LoginRequired({ action }: Props) {
  const { requireLogin } = useAuth()

  return (
    <div className="login-required">
      <p>{action} 로그인이 필요해요.</p>
      <button type="button" onClick={requireLogin}>
        로그인하기
      </button>
    </div>
  )
}

export default LoginRequired
