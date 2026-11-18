import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PROPERTY_TYPES } from '../constants/propertyTypes';

// 직방 스타일 메뉴: 매물 종류별 지도 + 맞춤추천 · 관심매물
const TYPE_MENUS = PROPERTY_TYPES.map((t) => ({ to: t.path, label: t.label }));
const EXTRA_MENUS = [
  { to: '/recommend', label: '맞춤추천' },
  { to: '/favorites', label: '관심매물' },
];

const navClass = (base) => ({ isActive }) => `${base}${isActive ? ' active' : ''}`;

export default function Header() {
  const { user, checking, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // 모바일 전체 메뉴(오른쪽 패널)
  const navRef = useRef(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  // 페이지 이동하면 메뉴 닫고, 모바일 매물 종류 줄에서 선택된 탭이 보이게 가운데로 스크롤
  useEffect(() => {
    setMenuOpen(false);
    const nav = navRef.current;
    const el = nav?.querySelector('.nav-link.active');
    if (nav && el && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [pathname]);

  // 매물 종류 탭 줄 좌우 스와이프: 터치는 브라우저 기본 스크롤, 마우스(PC 모바일 미리보기 등)는 끌어서 스크롤
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || nav.scrollWidth <= nav.clientWidth) return;
      dragging = true; moved = false; startX = e.clientX; startLeft = nav.scrollLeft;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) { moved = true; nav.classList.add('dragging'); }
      if (moved) nav.scrollLeft = startLeft - dx;
    };
    const onUp = () => { dragging = false; nav.classList.remove('dragging'); };
    // 끌었으면 손 뗄 때 링크가 눌리지 않게
    const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    nav.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    nav.addEventListener('click', onClick, true);
    nav.addEventListener('dragstart', (e) => e.preventDefault()); // 링크 끌기(이미지·URL 드래그) 방지
    return () => {
      nav.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      nav.removeEventListener('click', onClick, true);
    };
  }, []);

  // 메뉴 열렸을 때 Esc 로 닫기
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  let authArea = null;
  if (!checking && user) {
    authArea = (
      <>
        <span className="header-user"><b>{user.name}</b>님</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>로그아웃</button>
      </>
    );
  } else if (!checking) {
    authArea = (
      <>
        <Link to="/login" className="btn btn-ghost btn-sm">로그인</Link>
        <Link to="/signup" className="btn btn-primary btn-sm">회원가입</Link>
      </>
    );
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="ChatZip 홈">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
          </span>
          Chat<span className="logo-accent">Zip</span>
        </Link>
        {/* PC: 메뉴 전부 한 줄 · 모바일: 매물 종류만 알약 모양 탭으로 (가로 스크롤) */}
        <nav className="nav" ref={navRef} aria-label="매물 종류">
          {TYPE_MENUS.map((m) => (
            <NavLink key={m.to} to={m.to} className={navClass('nav-link')}>{m.label}</NavLink>
          ))}
          {EXTRA_MENUS.map((m) => (
            <NavLink key={m.to} to={m.to} className={navClass('nav-link nav-link-extra')}>{m.label}</NavLink>
          ))}
        </nav>
        <div className="header-auth">{authArea}</div>
        <button
          type="button"
          className="menu-btn"
          aria-label="전체 메뉴"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* 모바일 전체 메뉴: 맞춤추천 · 관심매물 · 로그인 */}
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" role="dialog" aria-label="전체 메뉴" onClick={(e) => e.stopPropagation()}>
            <div className="menu-head">
              {user ? <span><b>{user.name}</b>님</span> : <span>로그인하고 관심매물을 저장하세요</span>}
              <button type="button" className="menu-close" onClick={() => setMenuOpen(false)} aria-label="닫기">×</button>
            </div>
            {!checking && !user && (
              <div className="menu-auth">
                <Link to="/login" className="btn btn-ghost">로그인</Link>
                <Link to="/signup" className="btn btn-primary">회원가입</Link>
              </div>
            )}
            <div className="menu-section">매물 보기</div>
            {TYPE_MENUS.map((m) => (
              <NavLink key={m.to} to={m.to} className={navClass('menu-link')}>{m.label}</NavLink>
            ))}
            <div className="menu-section">내 서비스</div>
            {EXTRA_MENUS.map((m) => (
              <NavLink key={m.to} to={m.to} className={navClass('menu-link')}>{m.label}</NavLink>
            ))}
            {user && <button type="button" className="menu-link menu-logout" onClick={handleLogout}>로그아웃</button>}
          </div>
        </div>
      )}
    </header>
  );
}
