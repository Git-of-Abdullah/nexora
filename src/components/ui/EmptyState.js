import { InboxIcon } from 'lucide-react';

/**
 * EmptyState — displayed when a table / list has no data
 */
export default function EmptyState({ icon: Icon = InboxIcon, title = 'No records found', message, action }) {
  return (
    <div className="empty-state">
      <Icon className="empty-icon" size={48} />
      <div className="empty-title">{title}</div>
      {message && <p className="empty-sub">{message}</p>}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
