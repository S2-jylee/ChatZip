// 카카오맵 SDK를 한 번만 로드합니다.
// "지도가 빈 화면" 버그 방지: SDK 로드(kakao.maps.load) 완료 후에 지도를 생성해야 함 (기획서 11.2)

let promise = null;

export const HAS_KAKAO_KEY = Boolean(import.meta.env.VITE_KAKAO_MAP_KEY);

export function loadKakaoMap() {
  if (promise) return promise;
  const key = import.meta.env.VITE_KAKAO_MAP_KEY;
  if (!key) return Promise.reject(new Error('NO_KEY'));

  promise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`; // services = 주변 시설 검색
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => {
      promise = null;
      reject(new Error('LOAD_FAIL'));
    };
    document.head.appendChild(script);
  });
  return promise;
}
