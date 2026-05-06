import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Production Orders" value="—" sub="Coming soon" accent />
          <KPICard label="Employees" value="—" sub="Coming soon" />
          <KPICard label="Open Invoices" value="—" sub="Coming soon" />
          <KPICard label="Active Campaigns" value="—" sub="Coming soon" />
        </div>
        <p className="text-sm text-gray-400">Full dashboard KPIs will be wired in Step 3.</p>
      </main>
    </>
  );
}
