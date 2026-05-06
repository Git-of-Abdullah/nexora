import Topbar from '@/components/layout/Topbar';

export default function BillsPage() {
  return (
    <>
      <Topbar title="Bills" />
      <main className="flex-1 p-6">
        <p className="text-sm text-gray-500">Supplier bills — coming in Step 3.</p>
      </main>
    </>
  );
}
