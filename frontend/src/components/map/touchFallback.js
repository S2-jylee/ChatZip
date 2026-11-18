/**
 * 카카오맵 터치 · 마우스 보완
 * 카카오 SDK는 브라우저 정보(UA)로 PC/모바일을 구분합니다. 태블릿 웨일을 "PC 버전"으로 보면 PC로 판단해
 * 마우스 드래그만 받고 손가락 드래그는 무시합니다.
 * → 손가락으로 끌기 시작했는데 카카오가 지도를 안 움직이면, 그때부터 우리가 직접 이동(한 손가락)·확대(두 손가락)합니다.
 *   카카오가 정상으로 움직이는 기기(휴대폰 등)에서는 아무것도 하지 않습니다.
 *
 * 마우스도 같은 방식: 웨일 확장 "우클릭 차단 해제" 등이 mousedown/mouseup 을 페이지에 안 보내면 카카오가 드래그를 시작 못 함.
 *   pointerdown/pointermove 는 막히지 않으므로, 왼쪽 버튼으로 끌었는데 카카오가 안 움직이면 우리가 이동합니다.
 *
 * - 포인터 이벤트(pointerType touch/pen)와 터치 이벤트를 둘 다 받습니다. PC 모드 브라우저는 둘 중 하나만 줄 수 있어서,
 *   같은 손가락이 두 번 처리되지 않도록 먼저 들어온 쪽(source)만 씁니다.
 * - capture 단계에서 받습니다. PC 모드의 카카오 내부 요소가 이벤트 전달을 막아도 우리가 먼저 받도록.
 * 반환: 해제 함수
 */
export function attachTouchFallback(kakao, map, el) {
  // unknown → kakao(이번 손짓은 카카오가 처리) | manual(우리가 처리, 한 번 정해지면 계속)
  // kakao 는 손을 뗄 때 unknown 으로 되돌려 매번 다시 확인 (지도 로딩 애니메이션 중 첫 손짓을 잘못 판단해도 다음엔 동작)
  let mode = 'unknown';
  let source = null; // 'pointer' | 'touch' — 먼저 들어온 쪽만 사용
  const pts = new Map(); // id → { x, y }
  let pan = null; // { x, y, lat, lng, moves }
  let pinch = null; // { dist, level }

  const list = () => [...pts.values()];
  const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);

  const begin = () => {
    const p = list();
    if (p.length === 1) {
      const c = map.getCenter();
      pan = { x: p[0].x, y: p[0].y, lat: c.getLat(), lng: c.getLng(), moves: 0 };
      pinch = null;
    } else if (p.length === 2 && mode === 'manual') {
      pinch = { dist: dist(p) || 1, level: map.getLevel() };
      pan = null;
    }
  };

  // 반환값 true = 우리가 처리함 (기본 동작 막기)
  const move = () => {
    const p = list();
    if (pinch && p.length === 2) {
      const ratio = dist(p) / pinch.dist;
      const step = ratio >= 1 ? -Math.floor(Math.log2(ratio) * 1.5) : Math.floor(Math.log2(1 / ratio) * 1.5);
      const level = Math.min(14, Math.max(1, pinch.level + step));
      if (level !== map.getLevel()) map.setLevel(level, { animate: { duration: 150 } });
      return true;
    }
    if (mode === 'kakao' || !pan || p.length !== 1) return false;
    const t = p[0];
    pan.moves += 1;
    if (mode === 'unknown') {
      // 몇 번 움직일 동안 카카오가 지도 중심을 바꿨는지 확인
      if (pan.moves < 3 || Math.hypot(t.x - pan.x, t.y - pan.y) < 8) return false;
      const c = map.getCenter();
      if (c.getLat() !== pan.lat || c.getLng() !== pan.lng) { mode = 'kakao'; pan = null; return false; }
      mode = 'manual';
    }
    // 시작 지점 기준으로 이동 (처음 판단하는 동안 움직인 거리도 반영)
    const proj = map.getProjection();
    const start = proj.containerPointFromCoords(new kakao.maps.LatLng(pan.lat, pan.lng));
    const next = proj.coordsFromContainerPoint(new kakao.maps.Point(start.x - (t.x - pan.x), start.y - (t.y - pan.y)));
    map.setCenter(next);
    pan.x = t.x; pan.y = t.y; pan.lat = next.getLat(); pan.lng = next.getLng();
    return true;
  };

  const end = () => {
    if (pts.size === 0) { pan = null; pinch = null; source = null; if (mode === 'kakao') mode = 'unknown'; } else begin();
  };

  const accept = (kind) => {
    if (!source) source = kind;
    return source === kind;
  };

  // ---- 포인터 이벤트 ----
  const isFinger = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
  const isLeftMouse = (e) => e.pointerType === 'mouse' && e.button === 0;
  const onPDown = (e) => { if (!(isFinger(e) || isLeftMouse(e)) || !accept('pointer')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); begin(); };
  const onPMove = (e) => {
    if (source !== 'pointer' || !pts.has(e.pointerId)) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) { pts.delete(e.pointerId); end(); return; } // 버튼을 뗀 채 움직임
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (move()) { e.preventDefault(); e.stopPropagation(); }
  };
  const onPUp = (e) => { if (source !== 'pointer' || !pts.has(e.pointerId)) return; pts.delete(e.pointerId); end(); };

  // ---- 터치 이벤트 ----
  const syncTouches = (e) => { pts.clear(); [...e.touches].forEach((t) => pts.set(t.identifier, { x: t.clientX, y: t.clientY })); };
  const onTStart = (e) => { if (!accept('touch')) return; syncTouches(e); begin(); };
  const onTMove = (e) => {
    if (source !== 'touch') return;
    syncTouches(e);
    if (move()) { e.preventDefault(); e.stopPropagation(); }
  };
  const onTEnd = (e) => { if (source !== 'touch') return; syncTouches(e); end(); };

  const opt = { capture: true, passive: false };
  const on = [
    ['pointerdown', onPDown], ['pointermove', onPMove], ['pointerup', onPUp], ['pointercancel', onPUp],
    ['touchstart', onTStart], ['touchmove', onTMove], ['touchend', onTEnd], ['touchcancel', onTEnd],
  ];
  on.forEach(([t, f]) => el.addEventListener(t, f, opt));
  return () => on.forEach(([t, f]) => el.removeEventListener(t, f, opt));
}
