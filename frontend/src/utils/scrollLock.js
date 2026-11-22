// 모달이 뜰 때 뒤 화면 스크롤 잠금.
// overflow:hidden 만 주면 스크롤바가 사라진 만큼(약 15px) 화면이 오른쪽으로 밀림 → 그만큼 오른쪽 여백을 채워 둠
// 모달이 겹쳐 열려도(상세 모달 위 로그인 모달 등) 마지막 것이 닫힐 때만 풀림
let count = 0;
let saved = null;

export function lockScroll() {
  if (count === 0) {
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth; // 스크롤바 너비 (없으면 0)
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
  }
  count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count -= 1;
    if (count === 0 && saved) {
      document.body.style.overflow = saved.overflow;
      document.body.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}
