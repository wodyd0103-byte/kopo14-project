import { useNavigate } from 'react-router-dom'
import { useRestaurants } from './restaurant-context'
import CreateRestaurant from './create'

// 등록 페이지(/new): 등록(POST) 성공 후 재조회하고 홈으로 이동
function CreatePage() {
  const { reload } = useRestaurants()
  const navigate = useNavigate()

  const onCreated = async () => {
    await reload() // 등록 후 다시 GET
    navigate('/')
  }

  return <CreateRestaurant onCreated={onCreated} onClose={() => navigate('/')} />
}

export default CreatePage
