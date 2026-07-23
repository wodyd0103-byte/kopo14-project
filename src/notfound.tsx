import { Link } from 'react-router-dom'

// 정의되지 않은 주소 처리 (path="*")
function NotFound() {
  return (
    <div className="notfound">
      <h2>페이지를 찾을 수 없습니다.</h2>
      <p>요청하신 주소가 존재하지 않습니다.</p>
      <Link to="/">홈으로 돌아가기</Link>
    </div>
  )
}

export default NotFound
