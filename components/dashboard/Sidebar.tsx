'use client'

type SidebarProps = {
  children?: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="flex flex-col w-full border-r border-zinc-800 bg-zinc-950">
      {children && <div className="flex-1 overflow-auto p-4">{children}</div>}
    </aside>
  )
}
