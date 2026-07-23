// 로그인이 필요한 동작을 눌렀을 때 어느 로그인 폼으로 시선을 옮길지 정한다.
//
// 나중에 뜬 것이 사용자와 더 가깝다. 모달이 열려 있으면 모달 안의 폼이
// 헤더 구석의 폼보다 뒤에 등록되므로, 오버레이에 가려진 쪽 대신 바로 앞의
// 폼이 잡힌다.

const focusers: Array<() => void> = []

// 폼이 뜰 때 자기 자신을 등록한다. 반환값은 정리(cleanup) 함수.
export function registerLoginForm(focus: () => void) {
  focusers.push(focus)
  return () => {
    const i = focusers.indexOf(focus)
    if (i !== -1) focusers.splice(i, 1)
  }
}

export function focusLoginForm() {
  focusers[focusers.length - 1]?.()
}
