import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, listMembers } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorBox, Loading } from '../../components/Status';
import { formatDate } from '../../utils/format';
import { useTitle } from '../../utils/useTitle';

/** 대시보드 — 단지 수 · 회원 수 · 시별 단지 수 · 최근 가입 회원 */
export default function AdminDashboard() {
  useTitle('관리자');
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    Promise.all([getSummary(), listMembers({ size: 5 })])
      .then(([summary, members]) => setState({ loading: false, data: { summary, members }, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: errorMessage(err) }));
  }, []);

  if (state.loading) return <div className="admin-page"><Loading /></div>;
  if (state.error) return <div className="admin-page"><ErrorBox message={state.error} /></div>;
  const { summary: { total, byCity }, members } = state.data;
  const adminCount = members.all.filter((m) => m.role === 'ADMIN').length;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>대시보드</h1>
      </div>
      <div className="admin-stats">
        <Link to="estates" className="admin-card admin-stat">
          <span>등록 단지</span>
          <strong>{total.toLocaleString()}<small>개</small></strong>
        </Link>
        <Link to="members" className="admin-card admin-stat">
          <span>전체 회원</span>
          <strong>{members.all.length.toLocaleString()}<small>명</small></strong>
        </Link>
        <Link to="members?role=ADMIN" className="admin-card admin-stat">
          <span>관리자</span>
          <strong>{adminCount.toLocaleString()}<small>명</small></strong>
        </Link>
      </div>

      <div className="admin-split">
        <section className="admin-card admin-panel">
          <h2>시별 단지 수</h2>
          <ul className="admin-bars">
            {Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, n]) => (
              <li key={city}>
                <span>{city}</span>
                <span className="admin-bar" aria-hidden="true"><i style={{ width: `${(n / total) * 100}%` }} /></span>
                <b>{n.toLocaleString()}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card admin-panel">
          <div className="admin-panel-head">
            <h2>최근 가입 회원</h2>
            <Link to="members">전체 보기</Link>
          </div>
          <ul className="admin-loglist">
            {members.content.map((m) => (
              <li key={m.userId}>
                <span className={`admin-tag ${m.role === 'ADMIN' ? 'is-admin' : ''}`}>{m.role === 'ADMIN' ? '관리자' : '일반'}</span>
                <strong>{m.name} <small className="muted">{m.email}</small></strong>
                <time dateTime={m.createdAt ?? undefined}>{formatDate(m.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
