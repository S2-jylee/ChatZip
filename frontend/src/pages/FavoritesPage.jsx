import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AptListItem from '../components/AptListItem';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import CompareModal from '../components/CompareModal';
import '../components/CompareModal.css';
import { Empty, ErrorBox, Loading } from '../components/Status';
import { getFavorites, removeFavorite } from '../api/favorites';
import { errorMessage, statusOf } from '../api/client';
import { AI_BADGE, formatDate, formatPrice, perPyeong } from '../utils/format';
import { useDetailHref } from '../utils/detailLink';
import { useAiKinds } from '../utils/useAiKinds';
import { useTitle } from '../utils/useTitle';
import { SEARCH_PATH } from '../constants/menus';

const VIEWS = [['card', '카드 보기'], ['table', '표 보기']];
const NARROW = '(max-width: 800px)'; // 좁은 화면은 표가 너무 좁아 카드로만
const AI_ORDER = { low: 0, fair: 1, high: 2 };

// 표 열: [키, 제목, 정렬 값 꺼내기] — 정렬은 이미 받은 목록으로 (API 그대로)
const COLUMNS = [
  ['name', '단지', (f) => f.apartment.name ?? ''],
  ['gu', '지역', (f) => `${f.apartment.gu ?? ''} ${f.apartment.dong ?? ''}`],
  ['area', '전용면적', (f) => Number(f.apartment.areaM2) || 0],
  ['floor', '층', (f) => Number(f.apartment.floor) || 0],
  ['built', '준공', (f) => Number(f.apartment.builtYear) || 0],
  ['price', '거래가', (f) => Number(f.apartment.price) || 0],
  ['ppy', '평당가', (f) => perPyeong(f.apartment.price, f.apartment.areaM2) || 0],
  ['ai', 'AI 판정', (f, kinds) => AI_ORDER[kinds[f.apartment.aptId]] ?? 9],
  ['saved', '저장일', (f) => String(f.createdAt ?? '')],
];

/**
 * 비교 흐름 3단계 띠 — 메인 "비교하고 고르기"와 같은 순서 (찜하기 → 2~3개 고르기 → 비교하기)
 * 지금 단계를 표시하고, 3단계는 고를 만큼 고르면 바로 비교 창을 여는 버튼
 */
function CompareSteps({ count, max, onCompare }) {
  const ready = count >= 2;
  const step = ready ? 3 : 2;
  const pickText = count === 0 ? `비교할 매물을 2~${max}개 골라 주세요`
    : count === 1 ? '1개 더 고르면 비교할 수 있어요'
      : count >= max ? `최대 ${max}개까지 골랐어요` : `${max - count}개 더 고를 수 있어요`;
  return (
    <ol className="fav-steps" aria-label="비교하는 방법">
      <li className="done">
        <span className="fav-step-no" aria-hidden="true">1</span>
        <span className="fav-step-text"><b>찜하기</b><small>관심 매물에 담았어요</small></span>
      </li>
      <li className={step === 2 ? 'now' : 'done'} aria-current={step === 2 ? 'step' : undefined}>
        <span className="fav-step-no" aria-hidden="true">2</span>
        <span className="fav-step-text"><b>2~{max}개 고르기 <em>{count}/{max}</em></b><small aria-live="polite">{pickText}</small></span>
      </li>
      <li className={step === 3 ? 'now' : ''} aria-current={step === 3 ? 'step' : undefined}>
        <span className="fav-step-no" aria-hidden="true">3</span>
        <span className="fav-step-text">
          <b>비교하기</b>
          {ready
            ? <button type="button" className="btn btn-primary btn-sm fav-step-btn" onClick={onCompare}>지금 비교하기</button>
            : <small>실거래가 · 평당가 · 준공연도를 나란히</small>}
        </span>
      </li>
    </ol>
  );
}

/** 좁은 화면인지 (화면 크기가 바뀌면 다시 계산) */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export default function FavoritesPage() {
  const { openAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needLogin, setNeedLogin] = useState(false); // 로그인이 풀려 401 → 빈 목록 대신 로그인 안내
  const [confirmDel, setConfirmDel] = useState(null); // { aptId, name } — 삭제 확인 창
  const [notice, setNotice] = useState(''); // 삭제 실패 등 안내 (alert 대신)
  const [deleting, setDeleting] = useState(null);
  const [checked, setChecked] = useState([]); // 비교할 매물 id (최대 3개, 고른 순서)
  const [comparing, setComparing] = useState(false);
  const MAX = 3;
  const [view, setView] = useState('card'); // 'card' | 'table'
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 } — null = 저장된 순서 그대로
  const narrow = useNarrow();
  const detailHref = useDetailHref();
  useTitle('관심매물');

  const toggleCheck = (id) => setChecked((ids) => {
    if (ids.includes(id)) return ids.filter((x) => x !== id);
    return ids.length >= MAX ? ids : [...ids, id];
  });
  const compareList = useMemo(
    () => checked.map((id) => items.find((f) => f.apartment.aptId === id)?.apartment).filter(Boolean),
    [checked, items],
  );

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setNeedLogin(false);
    getFavorites()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 401) {
          setNeedLogin(true);
          openAuth('login', { onSuccess: () => load() });
        }
        else setError(errorMessage(err, '관심 매물을 불러오지 못했습니다.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [openAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => load(), [load]);

  // 매물마다 AI 적정가 · 저평가 · 고평가 배지
  const aiApts = useMemo(() => items.map((f) => f.apartment), [items]);
  const aiKinds = useAiKinds(aiApts);

  // 표 정렬: 같은 열을 다시 누르면 순서 반대 (글자 열은 가나다순부터, 숫자 열은 큰 값부터)
  const sortBy = (key) => setSort((cur) => (cur?.key === key ? { key, dir: -cur.dir } : { key, dir: key === 'name' || key === 'gu' ? 1 : -1 }));
  const rows = useMemo(() => {
    if (!sort) return items;
    const get = COLUMNS.find(([k]) => k === sort.key)[2];
    return [...items].sort((a, b) => {
      const x = get(a, aiKinds);
      const y = get(b, aiKinds);
      return (typeof x === 'string' ? x.localeCompare(y, 'ko') : x - y) * sort.dir;
    });
  }, [items, sort, aiKinds]);
  const showTable = view === 'table' && !narrow;

  const closeConfirm = useCallback(() => setConfirmDel(null), []);
  const handleDelete = async () => {
    const { aptId } = confirmDel;
    setDeleting(aptId);
    setNotice('');
    try {
      await removeFavorite(aptId);
      setItems((prev) => prev.filter((f) => f.apartment.aptId !== aptId));
      setChecked((ids) => ids.filter((x) => x !== aptId));
    } catch (err) {
      setNotice(errorMessage(err, '삭제하지 못했습니다.'));
    } finally {
      setDeleting(null);
      setConfirmDel(null);
    }
  };

  let content;
  if (loading) content = <Loading />;
  else if (needLogin) {
    content = (
      <Empty title="로그인이 필요해요">
        로그인하면 저장한 관심 매물을 볼 수 있어요.{' '}
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('login', { onSuccess: () => load() })}>로그인</button>
      </Empty>
    );
  } else if (error) content = <ErrorBox message={error} onRetry={load} />;
  else if (!items.length) {
    content = (
      <Empty title="저장한 관심 매물이 없습니다">
        <span className="fav-empty">
          <span>매물의 <Icon name="heart" size={15} label="하트" /> 버튼을 누르면 여기에 모여요.</span>
          <Link to={SEARCH_PATH} className="btn btn-primary btn-sm">매물찾기로 가기</Link>
        </span>
      </Empty>
    );
  } else {
    content = (
      <>
      {/* 한 줄: 왼쪽 비교 3단계 띠 · 오른쪽 보기 전환 탭(지도 매매 · 전세 · 월세 탭과 같은 부품, 띠와 같은 높이) — 좁은 화면은 탭 숨김 → 띠만 */}
      <div className="fav-toolbar">
        <CompareSteps count={checked.length} max={MAX} onCompare={() => setComparing(true)} />
        {!narrow && (
          <div
            className="deal-tabs fav-view"
            role="group"
            aria-label="보기 방식"
            style={{ '--n': VIEWS.length, '--i': Math.max(0, VIEWS.findIndex(([k]) => k === view)) }}
          >
            <span className="deal-thumb" aria-hidden="true" />
            {VIEWS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={view === k} className={`deal-tab${view === k ? ' on' : ''}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {/* 목록 바로 위 설명: AI 배지 뜻 (배지가 있을 때) · 표 정렬 방법 (표 보기일 때) */}
      {Object.keys(aiKinds).length > 0 && (
        <p className="fav-note">
          <Icon name="info" />
          <span><b>AI 배지</b>는 거래가를 AI 예상가와 비교한 참고 표시예요. 예상가와 ±5% 이내면 적정가, 그보다 낮으면 저평가, 높으면 고평가로 보여드려요.</span>
        </p>
      )}
      {showTable && <p className="fav-note fav-note-sub">열 제목을 누르면 그 기준으로 정렬돼요.</p>}

      {showTable ? (
        <div className="fav-table-wrap">
          <table className="fav-table">
            <caption className="sr-only">관심 매물 {items.length}건</caption>
            <thead>
              <tr>
                <th scope="col" className="col-check">비교</th>
                {COLUMNS.map(([k, label]) => (
                  <th
                    key={k}
                    scope="col"
                    className={`col-${k}`}
                    aria-sort={sort?.key === k ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" className={`fav-sort${sort?.key === k ? ' on' : ''}`} onClick={() => sortBy(k)}>
                      {label}
                      <span className="fav-sort-mark">{sort?.key === k && <Icon name="chevronDown" size={12} className={sort.dir > 0 ? 'up' : ''} />}</span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="col-del"><span className="sr-only">관심 해제</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ favoriteId, createdAt, apartment: a }) => {
                const on = checked.includes(a.aptId);
                const full = !on && checked.length >= MAX;
                const kind = aiKinds[a.aptId];
                const order = checked.indexOf(a.aptId) + 1;
                return (
                  <tr key={favoriteId} className={on ? 'on' : ''}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        className="cmp-check"
                        checked={on}
                        disabled={full}
                        onChange={() => toggleCheck(a.aptId)}
                        aria-label={`${a.name} 비교에 추가`}
                        title={full ? `최대 ${MAX}개까지 비교할 수 있어요` : '비교에 추가'}
                      />
                      {on && <span className="cmp-order">비교 {order}</span>}
                    </td>
                    <td className="col-name"><Link to={detailHref(a.aptId)}>{a.name}</Link></td>
                    <td className="col-gu">{a.gu} {a.dong}</td>
                    <td className="col-num">{Math.round(a.areaM2)}㎡</td>
                    <td className="col-num">{a.floor}층</td>
                    <td className="col-num">{a.builtYear}년</td>
                    <td className="col-num fav-price">{formatPrice(a.price)}</td>
                    <td className="col-num">{formatPrice(perPyeong(a.price, a.areaM2))}</td>
                    <td>{kind ? <span className={`ai-badge ai-${kind}`}>{AI_BADGE[kind]}</span> : <span className="muted">—</span>}</td>
                    <td className="col-num muted">{formatDate(createdAt)}</td>
                    <td className="col-del">
                      <button
                        type="button"
                        className="fav-remove"
                        disabled={deleting === a.aptId}
                        onClick={() => setConfirmDel({ aptId: a.aptId, name: a.name })}
                        aria-label={`${a.name} 관심 해제`}
                        title="관심 해제"
                      >
                        <Icon name="heart" size={18} filled />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <ul className="apt-list fav-list">
        {items.map(({ favoriteId, createdAt, apartment }) => {
          const on = checked.includes(apartment.aptId);
          const full = !on && checked.length >= MAX;
          const order = checked.indexOf(apartment.aptId) + 1; // 고른 순서 (비교 창 열 순서와 같음)
          return (
          <AptListItem
            key={favoriteId}
            apt={apartment}
            variant="card"
            aiKind={aiKinds[apartment.aptId]}
            active={on}
            leading={(
              // 누르기 쉬운 크기(44px 이상) + "비교" 글자, 고르면 "비교 1 · 2 · 3" 순서
              <label className={`cmp-pick${on ? ' on' : ''}${full ? ' full' : ''}`}>
                <input
                  type="checkbox"
                  className="cmp-check"
                  checked={on}
                  disabled={full}
                  onChange={() => toggleCheck(apartment.aptId)}
                  aria-label={`${apartment.name} 비교에 추가`}
                />
                <span aria-hidden="true">{on ? `비교 ${order}` : '비교'}</span>
              </label>
            )}
            actions={(
              <>
                {/* 삭제 = 저장할 때 누른 하트를 다시 누르는 "관심 해제" (빨간 버튼 대신 조용하게, 확인 창은 그대로) */}
                <button
                  type="button"
                  className="fav-remove"
                  disabled={deleting === apartment.aptId}
                  onClick={() => setConfirmDel({ aptId: apartment.aptId, name: apartment.name })}
                  aria-label={`${apartment.name} 관심 해제`}
                  title="관심 해제"
                >
                  <Icon name="heart" size={20} filled />
                </button>
                <span className="muted small">저장 {formatDate(createdAt)}</span>
              </>
            )}
          />
          );
        })}
      </ul>
      )}
      {checked.length > 0 && (
        <div className="compare-bar" role="region" aria-label="비교 선택">
          <div className="compare-bar-info">
            <b>{checked.length}</b> / {MAX}개 선택
            <small>
              {checked.length < 2 ? '1개 더 고르면 비교할 수 있어요'
                : checked.length >= MAX ? `최대 ${MAX}개까지 비교할 수 있어요 · ${compareList.map((a) => a.name).join(' · ')}`
                  : compareList.map((a) => a.name).join(' · ')}
            </small>
          </div>
          <div className="compare-bar-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked([])}>해제</button>
            <button type="button" className="btn btn-accent btn-sm" disabled={checked.length < 2} onClick={() => setComparing(true)}>
              비교하기
            </button>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="container section">
      <header className="page-head">
        <h1>관심 매물 {!loading && !error && !needLogin && <small>{items.length}건</small>}</h1>
        <p className="muted">저장한 매물을 모아 보고, 2~{MAX}개를 체크해 실거래가, 평당가, 준공연도를 비교해 보세요.</p>
      </header>
      {notice && (
        <div className="status status-error" role="alert">
          <p>{notice}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice('')}>닫기</button>
        </div>
      )}
      {content}
      {confirmDel && (
        <ConfirmDialog
          title="관심 매물에서 삭제할까요?"
          message={`'${confirmDel.name}'을(를) 목록에서 뺍니다.`}
          confirmLabel="삭제"
          danger
          busy={deleting === confirmDel.aptId}
          onConfirm={handleDelete}
          onCancel={closeConfirm}
        />
      )}
      {comparing && compareList.length >= 2 && (
        <CompareModal apartments={compareList} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}
