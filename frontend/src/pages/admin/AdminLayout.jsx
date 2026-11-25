import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Empty, Loading } from '../../components/Status';
import logoImg from '../../assets/chatzip-logo.png';
import './admin.css';

export const ADMIN_PATH = '/admin';
const ADMIN_MENUS = [
  { to: ADMIN_PATH, label: '대시보드', end: true },
  { to: `${ADMIN_PATH}/estates`, label: '단지 관리' },
  { to: `${ADMIN_PATH}/members`, label: '회원 관리' },
];

/** 관리자 화면 공통 틀 (시안 2a) — 관리자(role ADMIN)만 들어올 수 있음 */
export default function AdminLayout() {
  const { user, isAdmin, checking, openAuth, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { if (!checking && !user) openAuth('login'); }, [checking, user, openAuth]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  let body;
  if (checking) body = <Loading />;
  else if (!user) {
    body = (
      <Empty title="관리자 로그인이 필요합니다">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('login')}>로그인</button>
      </Empty>
    );
  } else if (!isAdmin) {
    body = (
      <Empty title="관리자만 볼 수 있는 화면입니다">
        <Link to="/" className="btn btn-primary btn-sm">서비스 화면으로</Link>
      </Empty>
    );
  } else body = <Outlet />;

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link to={ADMIN_PATH} className="admin-logo" aria-label="ChatZip 관리자 홈">
            <img src={logoImg} alt="ChatZip" width="319" height="191" />
            <span className="admin-badge">ADMIN</span>
          </Link>
          {isAdmin && (
            <nav className="admin-nav" aria-label="관리자 메뉴">
              {ADMIN_MENUS.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>{m.label}</NavLink>
              ))}
            </nav>
          )}
          {user && (
            <div className="admin-user" ref={wrapRef}>
              <button type="button" className="admin-user-pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <span className="user-avatar" aria-hidden="true">{user.name?.[0] ?? '?'}</span>
                <span className="admin-user-name">{user.name}</span>
              </button>
              {open && (
                <div className="user-menu" role="menu">
                  <Link to="/" role="menuitem" className="user-menu-item">서비스 화면으로</Link>
                  <button type="button" role="menuitem" className="user-menu-item user-menu-logout" onClick={async () => { await logout(); navigate('/'); }}>로그아웃</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="admin-main">{body}</main>
    </div>
  );
}
