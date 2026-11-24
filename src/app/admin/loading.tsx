export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading">
      <div className="h-10 w-64 max-w-full rounded-xl bg-[#E8E0D9]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-[#E8E0D9] bg-white p-5"
          >
            <div className="h-4 w-20 rounded bg-[#E8E0D9]" />
            <div className="mt-4 h-7 w-24 rounded bg-[#E8E0D9]" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-[#F5F1EE]" />
        ))}
      </div>
    </div>
  );
}
