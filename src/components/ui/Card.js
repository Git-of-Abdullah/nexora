export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function KPICard({ label, value, sub, accent = false }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-[#2E75B6]' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </Card>
  );
}
