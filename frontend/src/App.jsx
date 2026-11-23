import { useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ListingModal from './components/detail/ListingModal';
import Footer from './components/Footer';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import DetailPage from './pages/DetailPage';
import PredictPage from './pages/PredictPage';
import FavoritesPage from './pages/FavoritesPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { USE_MOCK } from './api/client';
import SearchPage from './pages/SearchPage';
import AnalysisPage from './pages/AnalysisPage';
import { MAP_PATH } from './constants/menus';
import { DEFAULT_TYPE, isTypeKey } from './constants/propertyTypes';

// 주소에 ?detail={id} 가 있으면 어느 화면이든 매물 상세 모달 (뒤로가기 = 닫기)
function DetailModalHost() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const id = params.get('detail');
  const close = useCallback(() => {
    const p = new URLSearchParams(location.search);
    p.delete('detail');
    const qs = p.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`);
  }, [location.pathname, location.search, navigate]);
  // 지도 화면은 모달 대신 지도 왼쪽 사이드 패널로 보여줌 (MapPage 에서 처리)
  if (location.pathname === MAP_PATH) return null;
  return id ? <ListingModal key={id} id={id} onClose={close} /> : null;
}

// 예전 주소로 들어오면 새 메뉴로 (쿼리 유지)
//  /apartment → /map · /villa → /map?type=villa (원룸·오피스텔·상가도 같음) · /recommend → /search?tab=recommend
function Redirect({ to, extra }) {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  Object.entries(extra ?? {}).forEach(([k, v]) => p.set(k, v));
  const qs = p.toString();
  return <Navigate to={`${to}${qs ? `?${qs}` : ''}`} replace />;
}

// 지도: ?type= 으로 매물 종류 (없으면 아파트). 종류가 바뀌면 화면 상태를 새로 시작
function MapRoute() {
  const [params] = useSearchParams();
  const t = params.get('type');
  const type = isTypeKey(t) ? t : DEFAULT_TYPE;
  return <MapPage key={type} type={type} />;
}
const LEGACY_TYPE_PATHS = { '/apartment': 'apt', '/villa': 'villa', '/oneroom': 'oneroom', '/officetel': 'officetel', '/store': 'store' };

// 라우트 구성 — 기획서 10.1 (메뉴: 홈 · 매물찾기 · 지역별분석 · 지도 · AI가격예측 · 관심매물)
export default function App() {
  return (
    <div className="app">
      <Header />
      {USE_MOCK && (
        <div className="mock-banner">MOCK · 가짜 데이터 (테스트 test / test1234)</div>
      )}
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path={MAP_PATH} element={<MapRoute />} />
          {Object.entries(LEGACY_TYPE_PATHS).map(([p, t]) => (
            <Route key={p} path={p} element={<Redirect to={MAP_PATH} extra={t === 'apt' ? {} : { type: t }} />} />
          ))}
          <Route path="/apartments/:id" element={<DetailPage />} />
          <Route path="/recommend" element={<Redirect to="/search" extra={{ tab: 'recommend' }} />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage mode="signup" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <DetailModalHost />
      <AuthModal />
    </div>
  );
}
