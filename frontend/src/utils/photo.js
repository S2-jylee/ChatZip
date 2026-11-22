// 매물 사진: 서버가 imageUrl 을 주면 그것을, 없으면 예시 사진(public/images/apt, Unsplash 무료 라이선스)을 n 번째로 씀
const SAMPLE_PHOTOS = 6;
export const photoOf = (item, n = 0) => item?.imageUrl || `${import.meta.env.BASE_URL}images/apt/apt${(n % SAMPLE_PHOTOS) + 1}.jpg`;
