export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANUFACTURING_MANAGER: 'manufacturing_manager',
  MANUFACTURING_STAFF: 'manufacturing_staff',
  HR_MANAGER: 'hr_manager',
  HR_STAFF: 'hr_staff',
  ACCOUNTANT: 'accountant',
  MARKETING_MANAGER: 'marketing_manager',
  MARKETING_STAFF: 'marketing_staff',
  GENERAL_EMPLOYEE: 'general_employee',
};

export const NAV_LINKS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: Object.values(ROLES),
  },
  {
    label: 'Manufacturing',
    href: '/manufacturing',
    roles: [ROLES.SUPER_ADMIN, ROLES.MANUFACTURING_MANAGER, ROLES.MANUFACTURING_STAFF],
    children: [
      { label: 'Production Orders', href: '/manufacturing/orders' },
      { label: 'Inventory', href: '/manufacturing/inventory' },
      { label: 'Quality Checks', href: '/manufacturing/quality' },
    ],
  },
  {
    label: 'Human Resources',
    href: '/hr',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.HR_STAFF, ROLES.GENERAL_EMPLOYEE, ROLES.ACCOUNTANT],
    children: [
      { label: 'Employees', href: '/hr/employees', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.HR_STAFF, ROLES.GENERAL_EMPLOYEE] },
      { label: 'Attendance', href: '/hr/attendance', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.HR_STAFF, ROLES.GENERAL_EMPLOYEE] },
      { label: 'Leave Requests', href: '/hr/leave', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.HR_STAFF, ROLES.GENERAL_EMPLOYEE] },
      { label: 'Payroll', href: '/hr/payroll', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.GENERAL_EMPLOYEE, ROLES.ACCOUNTANT] },
    ],
  },
  {
    label: 'Accounting',
    href: '/accounting',
    roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
    children: [
      { label: 'Invoices', href: '/accounting/invoices' },
      { label: 'Bills', href: '/accounting/bills' },
      { label: 'Reports', href: '/accounting/reports' },
    ],
  },
  {
    label: 'Marketing',
    href: '/marketing',
    roles: [ROLES.SUPER_ADMIN, ROLES.MARKETING_MANAGER, ROLES.MARKETING_STAFF],
    children: [
      { label: 'Campaigns', href: '/marketing/campaigns' },
      { label: 'Leads', href: '/marketing/leads' },
    ],
  },
];

export const STATUS_COLORS = {
  // Production orders
  Draft: 'bg-gray-100 text-gray-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Production': 'bg-yellow-100 text-yellow-700',
  'Quality Check': 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  // Invoices / bills
  Pending: 'bg-yellow-100 text-yellow-700',
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
  Unpaid: 'bg-red-100 text-red-700',
  // Leads
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-indigo-100 text-indigo-700',
  Qualified: 'bg-purple-100 text-purple-700',
  'Proposal Sent': 'bg-orange-100 text-orange-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
  // Leave
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  // Employee
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-700',
};
