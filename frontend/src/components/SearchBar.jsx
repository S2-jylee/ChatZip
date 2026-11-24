import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEARCH_PATH } from '../constants/menus';
import { ALL_REGIONS_LABEL, REGIONS } from '../constants/regions';

/** 홈 검색창 — 지역·최대 가격을 받아 매물찾기(/search)로 이동 (클릭 1) */
export default function SearchBar() {
  const navigate = useNavigate();
  const [gu, setGu] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (gu) params.set('gu', gu);
    if (maxPrice) params.set('maxPrice', maxPrice);
    navigate(`${SEARCH_PATH}?${params.toString()}`);
  };

  return (
    <form className="searchbar" onSubmit={handleSubmit}>
      <label className="field">
        <span>지역</span>
        <select value={gu} onChange={(e) => setGu(e.target.value)}>
          <option value="">{ALL_REGIONS_LABEL}</option>
          {REGIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <label className="field">
        <span>최대 가격 (만원)</span>
        <input
          type="number"
          min="0"
          step="1000"
          placeholder="예: 90000 (9억)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-accent btn-lg">매물 검색</button>
    </form>
  );
}
