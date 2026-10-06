import * as React from "react"

import { cn } from "@/lib/utils"

type DropdownMenuContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const context = React.useContext(DropdownMenuContext)

  if (!context) {
    throw new Error("DropdownMenuTrigger must be used inside DropdownMenu")
  }

  return (
    <div
      className={cn("relative", className)}
      aria-expanded={context.open}
      aria-haspopup="menu"
      onClick={() => context.setOpen((value) => !value)}
    >
      {children}
    </div>
  )
}

function DropdownMenuContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const context = React.useContext(DropdownMenuContext)

  if (!context?.open) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute right-0 top-full z-[80] mt-2 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

function DropdownMenuGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>
}

function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-slate-200" />
}

function DropdownMenuItem({
  children,
  className,
  variant = "default",
  onClick,
}: {
  children: React.ReactNode
  className?: string
  variant?: "default" | "destructive"
  onClick?: () => void
}) {
  const context = React.useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100",
        variant === "destructive" && "text-rose-600 hover:bg-rose-50",
        className
      )}
      onClick={() => {
        onClick?.()
        context?.setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuItem,
}
