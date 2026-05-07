/**
 * Badge / Status pill
 *
 * Pass `status` for auto-mapping, or `variant` directly.
 * variants: success | warning | danger | accent | neutral | purple | indigo | orange
 */

const STATUS_VARIANT_MAP = {
  // Production
  Draft:          'neutral',
  Scheduled:      'accent',
  'In Production':'warning',
  'Quality Check':'purple',
  Completed:      'success',
  Cancelled:      'danger',
  // Invoices / Bills
  Pending:        'warning',
  Paid:           'success',
  Overdue:        'danger',
  Unpaid:         'danger',
  Partial:        'orange',
  Sent:           'accent',
  // Leads
  New:            'accent',
  Contacted:      'indigo',
  Qualified:      'purple',
  'Proposal Sent':'orange',
  Won:            'success',
  Lost:           'danger',
  // Leave / General
  Approved:       'success',
  Rejected:       'danger',
  // Employee
  Active:         'success',
  Inactive:       'neutral',
  // Campaigns
  Planning:       'neutral',
  Active:         'success',
  Paused:         'warning',
  Ended:          'neutral',
};

export default function Badge({ status, variant, dot = true, className = '' }) {
  const v = variant || STATUS_VARIANT_MAP[status] || 'neutral';
  return (
    <span className={`badge badge-${v} ${className}`}>
      {dot && <span className="badge-dot" />}
      {status}
    </span>
  );
}
