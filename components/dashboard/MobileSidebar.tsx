'use client'

type MobileSidebarProps = {
  children?: React.ReactNode
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  return (
    <aside className="flex flex-col w-full bg-zinc-950">
      {children && <div className="flex-1 overflow-auto p-4">{children}</div>}
    </aside>
  )
}
