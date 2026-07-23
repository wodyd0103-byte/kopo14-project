import { Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./auth-context";
import RestaurantProvider from "./store";
import { useRestaurants } from "./restaurant-context";
import LoginForm from "./login-form";
import Home from "./home";
import Category from "./category";
import MapPage from "./map";
import Best from "./best";
import CreatePage from "./create-page";
import EditRestaurant from "./edit";
import NotFound from "./notfound";
import "./App.css";

// 화면 껍데기 + 라우팅. 스토어를 읽어야 해서 Provider 안쪽에 있다.
function Shell() {
  const { user, logout } = useAuth();
  const { loading, error, reload } = useRestaurants();

  return (
    <div className="app">
      {/* 로그인은 화면을 막지 않는다. 목록은 누구에게나 보이고,
          여기 구석의 입력칸은 '쓰려면' 필요할 때만 눈에 들어오면 된다. */}
      <div className="user-bar">
        {user ? (
          <>
            <span className="user-name">👤 {user.nickname}님</span>
            <button type="button" className="logout-btn" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <LoginForm variant="bar" />
        )}
      </div>

      <h1>내가 방문한 음식점</h1>

      <nav className="nav">
        <Link to="/">전체</Link>
        <Link to="/category">카테고리</Link>
        <Link to="/map">지도</Link>
        <Link to="/best">베스트</Link>
        <Link to="/new">음식점 등록</Link>
      </nav>

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void reload().catch(() => {})}>
            다시 시도
          </button>
        </div>
      )}

      {/* 첫 조회가 끝나기 전에는 화면을 그리지 않는다.
          그리면 목록은 "표시할 음식점이 없습니다", 수정 화면은
          "해당 음식점을 찾을 수 없습니다"라고 잘못 말한다. */}
      {loading ? (
        <p className="loading">불러오는 중…</p>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<Category />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/best" element={<Best />} />
          <Route path="/new" element={<CreatePage />} />
          <Route path="/edit/:id" element={<EditRestaurant />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </div>
  );
}

// App은 로직 없이 Provider 연결만 담당
function App() {
  return (
    <RestaurantProvider>
      <Shell />
    </RestaurantProvider>
  );
}

export default App;
