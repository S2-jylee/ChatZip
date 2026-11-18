import { useState } from 'react';
import KakaoMap from './KakaoMap';
import VectorMap from './VectorMap';
import LeafletMap from './LeafletMap';
import { HAS_KAKAO_KEY } from '../../utils/kakaoLoader';
import './MapPopup.css';
import './MapExtras.css';

/**
 * 지도 공통 컴포넌트. 사용 순서:
 *  1) .env 에 VITE_KAKAO_MAP_KEY 가 있으면 카카오맵
 *  2) 없으면 단순화된 벡터 지도 (OpenFreeMap, 키 불필요)
 *  3) 브라우저가 WebGL 을 지원하지 않으면 Leaflet 이미지 지도
 *
 * props
 *  apartments      표시할 매물 배열 (바뀌면 전체가 보이도록 화면 맞춤)
 *  activeId        강조할 매물 (목록 hover)
 *  selectedId      선택된 매물
 *  onSelect(apt)   마커 클릭 (지도 빈 곳 클릭 시 onSelect(null)). 
 *  onHover(apt)    마커에 마우스를 올리면 apt, 벗어나면 null
 *  popup           선택된 매물(selectedId) 위치에 띄울 React 요소
 *  onBoundsChange  지도 이동 시 { south, west, north, east }
 *  mapType         'road' | 'satellite'
 *  places          주변 시설 [{ id, kind, name, lat, lng }]
 *  viewedIds       이미 본 매물 id Set → 회색 마커
 *  interactive    false 면 드래그·확대 불가 (미리보기용)
 *  maxZoom         자동 맞춤 시 최대 확대
 *  className       바깥 div 클래스 (높이 지정용)
 */
export default function MapView({ className = '', onSelect, onHover, ...rest }) {
  const props = {
    ...rest,
    // 지도 빈 곳 클릭(null)은 팝업이 떠 있을 때만 전달
    onSelect: (apt) => { if (apt || rest.popup) onSelect?.(apt); },
    onPinHover: onHover, // 마커에 마우스 올림(apt) / 벗어남(null)
  };
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const [vectorFailed, setVectorFailed] = useState(false);

  let map;
  if (HAS_KAKAO_KEY && !kakaoFailed) map = <KakaoMap {...props} onFail={() => setKakaoFailed(true)} />;
  else if (!vectorFailed) map = <VectorMap {...props} onFail={() => setVectorFailed(true)} />;
  else map = <LeafletMap {...props} />;

  return <div className={`map-wrap ${className}`}>{map}</div>;
}
