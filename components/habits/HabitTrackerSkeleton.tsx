export default function HabitTrackerSkeleton() {
  return (
    <div className="space-y-3 max-w-xl mx-auto">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-[#0a0a0a] border border-[#E5C06E]/20 rounded-sm px-4 py-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-zinc-800 rounded border border-zinc-700" />
            <div className="flex-1">
              <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

