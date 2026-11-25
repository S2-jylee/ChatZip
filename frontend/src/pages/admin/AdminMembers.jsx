import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteMember, listMembers, setMemberRole } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Empty, ErrorBox, Loading } from '../../components/Status';
import { formatDate } from '../../utils/format';
import { useTitle } from '../../utils/useTitle';
import { Pager, RowMenu } from './adminShared';

const PAGE_SIZE = 10;
const ROLE_LABEL = { ADMIN: '관리자', USER: '일반' };
const providerText = (p) => (p === 'kakao' ? '카카오' : '이메일');

/** 회원 관리 — 이름·이메일 검색, 권한(관리자 ↔ 일반) 변경, 회원 삭제. 내 계정은 바꿀 수 없음 */
export default function AdminMembers() {
  useTitle('회원 관리');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 0;

  const [word, setWord] = useState(q);
  useEffect(() => { setWord(q); }, [q]);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [confirm, setConfirm] = useState(null); // { type: 'role' | 'delete', member }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    listMembers({ role, q, page, size: PAGE_SIZE })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: errorMessage(err) }));
  }, [role, q, page]);
  useEffect(() => { load(); }, [load]);

  const update = (next) => {
    const p = new URLSearchParams();
    Object.entries({ role, q, ...next }).forEach(([k, v]) => { if (v !== '' && v != null && !(k === 'page' && !v)) p.set(k, v); });
    setParams(p);
  };

  const cancel = useCallback(() => setConfirm(null), []);
  const run = async () => {
    const { type, member } = confirm;
    setBusy(true);
    try {
      if (type === 'delete') {
        await deleteMember(member.userId);
        setNotice(`${member.name} 회원을 삭제했습니다.`);
      } else {
        const next = member.role === 'ADMIN' ? 'USER' : 'ADMIN';
        await setMemberRole(member.userId, next);
        setNotice(`${member.name} 회원을 ${ROLE_LABEL[next]} 회원으로 바꿨습니다.`);
      }
      load();
    } catch (err) {
      setNotice(errorMessage(err, '처리하지 못했습니다.'));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const isMe = (m) => m.userId === user?.userId;
  const roleAction = (m) => (m.role === 'ADMIN' ? '일반으로 변경' : '관리자로 지정');

  const { data } = state;
  let content;
  if (state.loading && !data) content = <Loading />;
  else if (state.error) content = <ErrorBox message={state.error} onRetry={load} />;
  else if (!data.content.length) {
    content = (
      <Empty title="조건에 맞는 회원이 없습니다">
        {(role || q) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParams({})}>조건 지우기</button>}
      </Empty>
    );
  } else {
    content = (
      <div className={`admin-card admin-table-card${state.loading ? ' is-loading' : ''}`}>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">이메일</th>
              <th scope="col">가입 방식</th>
              <th scope="col">가입일</th>
              <th scope="col">권한</th>
              <th scope="col" className="center">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((m) => (
              <tr key={m.userId}>
                <td className="strong">{m.name}{isMe(m) && <span className="admin-tag admin-me">나</span>}</td>
                <td className="muted">{m.email}</td>
                <td>{providerText(m.provider)}</td>
                <td className="num">{formatDate(m.createdAt)}</td>
                <td><span className={`admin-tag ${m.role === 'ADMIN' ? 'is-admin' : ''}`}>{ROLE_LABEL[m.role] ?? m.role}</span></td>
                <td className="center">
                  {isMe(m) ? <span className="muted small">—</span> : (
                    <span className="admin-row-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setConfirm({ type: 'role', member: m })}>{roleAction(m)}</button>
                      <button type="button" className="btn btn-danger btn-xs" onClick={() => setConfirm({ type: 'delete', member: m })} aria-label={`${m.name} 삭제`}>삭제</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="admin-cards">
          {data.content.map((m) => (
            <li key={m.userId}>
              <div className="admin-cards-main">
                <strong>{m.name}{isMe(m) && <span className="admin-tag admin-me">나</span>}</strong>
                <span>{m.email}</span>
                <span>{providerText(m.provider)} · {formatDate(m.createdAt)} 가입</span>
              </div>
              <span className={`admin-tag ${m.role === 'ADMIN' ? 'is-admin' : ''}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
              {isMe(m) ? <span className="row-menu-spacer" aria-hidden="true" /> : (
                <RowMenu
                  name={m.name}
                  items={[
                    { label: roleAction(m), onClick: () => setConfirm({ type: 'role', member: m }) },
                    { label: '삭제', danger: true, onClick: () => setConfirm({ type: 'delete', member: m }) },
                  ]}
                />
              )}
            </li>
          ))}
        </ul>
        <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => update({ page: p })} />
      </div>
    );
  }

  const c = confirm;
  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>회원 관리 {data && <small>{data.totalElements.toLocaleString()}명</small>}</h1>
      </div>

      <form className="admin-card admin-filter" role="search" onSubmit={(ev) => { ev.preventDefault(); update({ q: word.trim(), page: 0 }); }}>
        <select className="select" value={role} aria-label="권한" onChange={(ev) => update({ role: ev.target.value, page: 0 })}>
          <option value="">권한 · 전체</option>
          <option value="ADMIN">관리자</option>
          <option value="USER">일반</option>
        </select>
        <input className="admin-input admin-filter-q" type="search" placeholder="이름 · 이메일 검색" aria-label="이름 · 이메일 검색" value={word} onChange={(ev) => setWord(ev.target.value)} />
        <button type="submit" className="btn admin-btn-navy">검색</button>
      </form>

      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {content}

      {c && (
        <ConfirmDialog
          title={c.type === 'delete' ? '회원을 삭제할까요?' : `${roleAction(c.member)}할까요?`}
          message={c.type === 'delete'
            ? `${c.member.name}(${c.member.email}) 회원과 관심 매물이 모두 지워집니다. 되돌릴 수 없습니다.`
            : (c.member.role === 'ADMIN'
              ? `${c.member.name} 회원은 더 이상 관리자 페이지에 들어올 수 없습니다.`
              : `${c.member.name} 회원이 관리자 페이지에서 단지 · 회원을 관리할 수 있게 됩니다.`)}
          confirmLabel={c.type === 'delete' ? '삭제' : '변경'}
          danger={c.type === 'delete'}
          busy={busy}
          onConfirm={run}
          onCancel={cancel}
        />
      )}
    </div>
  );
}
