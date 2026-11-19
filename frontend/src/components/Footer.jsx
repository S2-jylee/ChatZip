import { Link, useLocation } from 'react-router-dom';
import { PROPERTY_TYPES } from '../constants/propertyTypes';

const SERVICE_LINKS = [
  { to: '/recommend', label: '맞춤추천' },
  { to: '/predict', label: 'AI 예상가' },
  { to: '/favorites', label: '관심매물' },
];

/** 사이트 하단 — 지도 화면은 지도가 화면 전체를 쓰므로 표시하지 않음 */
export default function Footer() {
  const { pathname } = useLocation();
  if (PROPERTY_TYPES.some((t) => t.path === pathname)) return null;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="ChatZip 홈">
            Chat<span className="logo-accent">Zip</span>
          </Link>
          <p>서울 실거래가 기반 매물 지도와 AI 예상가 서비스</p>
        </div>

        <nav className="footer-links" aria-label="하단 메뉴">
          <div>
            <strong>매물 지도</strong>
            {PROPERTY_TYPES.map((t) => <Link key={t.type} to={t.path}>{t.label}</Link>)}
          </div>
          <div>
            <strong>서비스</strong>
            {SERVICE_LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <p>
          데이터 출처: 국토교통부 실거래가 공개시스템 · 공공데이터포털.
          AI 예상가는 <b>참고용</b> 추정치이며 실제 시세와 다를 수 있습니다.
        </p>
        <p>© {new Date().getFullYear()} ChatZip</p>
      </div>
    </footer>
  );
}
