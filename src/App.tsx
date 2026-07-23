import { Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./auth-context";
import RestaurantProvider from "./store";
import LoginForm from "./login-form";
import Home from "./home";
import Category from "./category";
import Best from "./best";
import CreatePage from "./create-page";
import EditRestaurant from "./edit";
import NotFound from "./notfound";
import "./App.css";

// App은 로직 없이 Provider + 셸 + 라우팅 연결만 담당
function App() {
  const { user, logout } = useAuth();

  return (
    <RestaurantProvider>
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
