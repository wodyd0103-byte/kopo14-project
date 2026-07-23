import { useEffect, useState, type ChangeEvent } from 'react'

interface Props {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

// 사진 주소 입력 + 미리보기 (등록/수정 폼 공용)
// 인터넷 주소(https://...)와 public 폴더 경로(/images/사진.jpg) 둘 다 사용 가능
export function ImageInput({ value, onChange }: Props) {
  const [failed, setFailed] = useState(false)
  const url = value.trim()

  // 주소를 고치면 이전 실패 표시를 지움
  useEffect(() => {
    setFailed(false)
  }, [url])

  return (
    <label>
      사진 주소
      <input
        name="image"
        value={value}
        onChange={onChange}
        placeholder="https://... 또는 /images/사진.jpg"
      />

      {url && (
        <span className="image-preview">
          {failed ? (
            <span className="image-preview-error">
              사진을 불러오지 못했습니다. 주소를 확인해 주세요.
            </span>
          ) : (
            <img src={url} alt="미리보기" onError={() => setFailed(true)} />
          )}
        </span>
      )}
    </label>
  )
}

export default ImageInput
