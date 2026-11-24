// "동작 줄이기"(prefers-reduced-motion) 설정이면 부드러운 스크롤 대신 바로 이동
export const scrollBehavior = () => (
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
);
