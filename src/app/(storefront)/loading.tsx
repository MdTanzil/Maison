export default function StorefrontLoading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 animate-pulse"
      aria-label="Loading"
    >
      <div className="h-8 w-56 max-w-full rounded-lg bg-[#E8E0D9]" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-[#E8E0D9]" />
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E8E0D9] bg-white overflow-hidden"
          >
            <div className="aspect-[4/5] w-full bg-[#F5F1EE]" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-[#E8E0D9]" />
              <div className="h-4 w-1/2 rounded bg-[#E8E0D9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
