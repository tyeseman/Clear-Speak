export function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-black/5 bg-white p-4 shadow-soft">
      <div className="text-sm font-medium text-ink/60">{label}</div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      {detail ? <div className="mt-1 text-sm text-ink/65">{detail}</div> : null}
    </div>
  );
}
