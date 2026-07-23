interface Props {
  // 0 ~ 5
  value: number
  size?: 'sm' | 'md' | 'lg'
}

// 소수점 평점을 별로 보여준다. 4.3이면 별 네 개와 다섯 번째의 30%가 찬다.
//
// 별을 반 개씩 잘라 여러 글자로 만드는 대신, 같은 별 다섯 개를 두 줄 겹쳐 두고
// 위쪽만 값만큼 잘라 보여준다. 그래야 0.1 단위가 그대로 드러난다.
function Stars({ value, size = 'md' }: Props) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100))

  return (
    <span className={`stars ${size}`} role="img" aria-label={`5점 만점에 ${value.toFixed(1)}점`}>
      <span className="stars-bg" aria-hidden="true">
        ★★★★★
      </span>
      <span className="stars-fill" style={{ width: `${percent}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  )
}

export default Stars
