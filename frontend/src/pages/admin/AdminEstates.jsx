import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteEstate, listEstates } from '../../api/admin';
import { errorMessage } from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Empty, ErrorBox, Loading } from '../../components/Status';
import { useTitle } from '../../utils/useTitle';
import { areaText, CITIES, districtsOf, Pager, priceText, RowMenu } from './adminShared';

const PAGE_SIZE = 10;

export default function AdminEstates() {
  useTitle('단지 관리');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const city = params.get('city') ?? '';
  const district = params.get('district') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 0;

  const [word, setWord] = useState(q);
  useEffect(() => { setWord(q); }, [q]);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [target, setTarget] = useState(null); // 삭제 확인 중인 단지
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    listEstates({ city, district, q, page, size: PAGE_SIZE })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: errorMessage(err) }));
  }, [city, district, q, page]);
  useEffect(() => { load(); }, [load]);

  const update = (next) => {
    const p = new URLSearchParams();
    Object.entries({ city, district, q, ...next }).forEach(([k, v]) => { if (v !== '' && v != null && !(k === 'page' && !v)) p.set(k, v); });
    setParams(p);
  };

  const edit = (e) => navigate(`${e.estIdx}/edit`);
  const cancelDelete = useCallback(() => setTarget(null), []);
  const remove = async () => {
    setBusy(true);
    try {
      await deleteEstate(target.estIdx);
      setNotice(`'${target.estName}' 단지를 삭제했습니다.`);
      setTarget(null);
      load();
    } catch (err) {
      setNotice(errorMessage(err, '삭제하지 못했습니다.'));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const { data } = state;
  let content;
  if (state.loading && !data) content = <Loading />;
  else if (state.error) content = <ErrorBox message={state.error} onRetry={load} />;
  else if (!data.content.length) {
    content = (
      <Empty title="조건에 맞는 단지가 없습니다">
        {(city || district || q) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParams({})}>조건 지우기</button>}
      </Empty>
    );
  } else {
    content = (
      <div className={`admin-card admin-table-card${state.loading ? ' is-loading' : ''}`}>
        {/* PC: 표 */}
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">단지명</th>
              <th scope="col">주소</th>
              <th scope="col">지역</th>
              <th scope="col">준공</th>
              <th scope="col">최근 거래가</th>
              <th scope="col">거래 면적</th>
              <th scope="col" className="center">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((e) => (
              <tr key={e.estIdx}>
                <td className="strong">{e.estName}</td>
                <td className="muted">{e.estAddress}</td>
                <td>{[e.city, e.district, e.dong].filter(Boolean).join(' ')}</td>
                <td>{e.builtYear ? `${e.builtYear}년` : '—'}</td>
                <td className="strong num">{priceText(e.price)}</td>
                <td className="num">{areaText(e.areaM2)}</td>
                <td className="center">
                  <span className="admin-row-actions">
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => edit(e)} aria-label={`${e.estName} 수정`}>수정</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => setTarget(e)} aria-label={`${e.estName} 삭제`}>삭제</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 모바일: 카드 목록 + ⋮ 메뉴 */}
        <ul className="admin-cards">
          {data.content.map((e) => (
            <li key={e.estIdx}>
              <div className="admin-cards-main">
                <strong>{e.estName}</strong>
                <span>{[e.city, e.district, e.dong].filter(Boolean).join(' ')}{e.builtYear ? ` · ${e.builtYear}년` : ''}</span>
              </div>
              <div className="admin-cards-price">
                <strong>{priceText(e.price)}</strong>
                <span>{areaText(e.areaM2)}</span>
              </div>
              <RowMenu name={e.estName} items={[{ label: '수정', onClick: () => edit(e) }, { label: '삭제', danger: true, onClick: () => setTarget(e) }]} />
            </li>
          ))}
        </ul>
        <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => update({ page: p })} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-head">
        <h1>단지 관리 {data && <small>{data.totalElements.toLocaleString()}개</small>}</h1>
        <Link to="new" className="btn btn-primary admin-add">
          <span>+ <span className="pc-only">단지 </span>등록</span>
        </Link>
      </div>

      <form
        className="admin-card admin-filter"
        onSubmit={(ev) => { ev.preventDefault(); update({ q: word.trim(), page: 0 }); }}
        role="search"
      >
        <select className="select" value={city} aria-label="시" onChange={(ev) => update({ city: ev.target.value, district: '', page: 0 })}>
          <option value="">시 · 전체</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={district} aria-label="구" disabled={!city} onChange={(ev) => update({ district: ev.target.value, page: 0 })}>
          <option value="">구 · 전체</option>
          {districtsOf(city).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input className="admin-input admin-filter-q" type="search" placeholder="단지명 검색" aria-label="단지명 검색" value={word} onChange={(ev) => setWord(ev.target.value)} />
        <button type="submit" className="btn admin-btn-navy">검색</button>
      </form>

      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {content}

      {target && (
        <ConfirmDialog
          title="단지를 삭제할까요?"
          message={`'${target.estName}' 단지와 연결된 정보가 목록에서 사라집니다. 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}
