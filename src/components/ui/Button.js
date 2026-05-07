import { Loader2 } from 'lucide-react';

/**
 * Button
 * variants: primary | secondary | danger | ghost | success
 * sizes:    sm | md | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  ...props
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading
        ? <Loader2 size={14} className="spinner-sm" style={{ animation: 'spin 0.6s linear infinite' }} />
        : Icon && <Icon size={size === 'sm' ? 13 : 15} />
      }
      {children}
      {!loading && IconRight && <IconRight size={size === 'sm' ? 13 : 15} />}
    </button>
  );
}

export function IconButton({ icon: Icon, variant = 'ghost', size = 'md', title, className = '', ...props }) {
  const cls = [
    'btn btn-icon',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} title={title} {...props}>
      <Icon size={15} />
    </button>
  );
}
