import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Base Card
 */
export default function Card({ children, className = '', style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * Card Header — title + optional right slot
 */
export function CardHeader({ title, subtitle, right, children }) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title || children}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

/**
 * Card Body — padded content
 */
export function CardBody({ children, className = '' }) {
  return <div className={`card-pad ${className}`}>{children}</div>;
}

/**
 * KPI Card — used on dashboards
 * trend: 'up' | 'down' | 'flat' | null
 */
export function KPICard({ label, value, sub, icon: Icon, iconBg, iconColor, trend, trendLabel }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendClass = trend === 'up' ? 'kpi-trend-up' : trend === 'down' ? 'kpi-trend-down' : 'text-muted';

  return (
    <div className="kpi-card">
      {Icon && (
        <div className="kpi-icon-wrap" style={{ background: iconBg || 'var(--accent-light)' }}>
          <Icon size={22} style={{ color: iconColor || 'var(--accent)' }} />
        </div>
      )}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value ?? '—'}</div>
      {(sub || trendLabel) && (
        <div className="kpi-sub">
          {trend && <TrendIcon size={13} className={trendClass} />}
          <span className={trend ? trendClass : ''}>{trendLabel || sub}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Row — for displaying a label/value pair inside a card
 */
export function StatRow({ label, value, className = '' }) {
  return (
    <div className={`flex-between ${className}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
