import { Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./auth-context";
import RestaurantProvider from "./store";
import Login from "./login";
import Home from "./home";
import Category from "./category";
import Best from "./best";
import CreatePage from "./create-page";
import EditRestaurant from "./edit";
import NotFound from "./notfound";
import "./App.css";

// App은 로직 없이 로그인 게이트 + Provider + 셸 + 라우팅 연결만 담당
function App() {
  const { user, guest, logout, requireLogin } = useAuth();

  // 로그인도 안 했고 둘러보기도 고르지 않았을 때만 로그인 화면을 보여준다.
  // 둘러보기 중에는 읽기는 다 되고, 쓰는 동작에서만 requireLogin이 여기로 되돌린다.
  if (!user && !guest) return <Login />;

  return (
    <RestaurantProvider>
      <div className="app">
        <div className="user-bar">
          {user ? (
            <>
              <span className="user-name">👤 {user.nickname}님</span>
              <button type="button" className="logout-btn" onClick={logout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <span className="user-name guest">👀 둘러보는 중</span>
              <button type="button" className="logout-btn" onClick={requireLogin}>
                로그인
              </button>
            </>
          )}
        </div>

        <h1>내가 방문한 음식점</h1>

        <nav className="nav">
          <Link to="/">전체</Link>
          <Link to="/category">카테고리</Link>
          <Link to="/best">베스트</Link>
          <Link to="/new">음식점 등록</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<Category />} />
          <Route path="/best" element={<Best />} />
          <Route path="/new" element={<CreatePage />} />
          <Route path="/edit/:id" element={<EditRestaurant />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </RestaurantProvider>
  );
}

export default App;
