import { PRICE_TIERS } from '../../utils/format';

export default function PriceLegend() {
  return (
    <div className="legend" aria-label="가격대 범례">
      {PRICE_TIERS.map((t) => (
        <span key={t.key} className="legend-item">
          <i className={`legend-dot tier-${t.key}`} />
          {t.label}
        </span>
      ))}
    </div>
  );
}
