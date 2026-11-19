import { useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ListingModal from './components/detail/ListingModal';
import Footer from './components/Footer';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import DetailPage from './pages/DetailPage';
import RecommendPage from './pages/RecommendPage';
import PredictPage from './pages/PredictPage';
import FavoritesPage from './pages/FavoritesPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NotFoundPage from './pages/NotFoundPage';
import { USE_MOCK } from './api/client';
import { PROPERTY_TYPES } from './constants/propertyTypes';

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
  if (PROPERTY_TYPES.some((t) => t.path === location.pathname)) return null;
  return id ? <ListingModal key={id} id={id} onClose={close} /> : null;
}

// 예전 주소 /map?… → /apartment?… (쿼리 유지)
function LegacyMapRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/apartment${search}`} replace />;
}

// 라우트 구성 — 기획서 10.1
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
          {PROPERTY_TYPES.map((t) => (
            <Route key={t.type} path={t.path} element={<MapPage key={t.type} type={t.type} />} />
          ))}
          <Route path="/map" element={<LegacyMapRedirect />} />
          <Route path="/apartments/:id" element={<DetailPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <DetailModalHost />
    </div>
  );
}
