"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-100 group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-300 dark:group-[.toaster]:bg-zinc-900 dark:group-[.toaster]:text-zinc-100 dark:group-[.toaster]:border-zinc-700",
          description: "group-[.toast]:text-zinc-500 dark:group-[.toast]:text-zinc-400",
          actionButton:
            "group-[.toast]:bg-violet-100 group-[.toast]:text-violet-700 dark:group-[.toast]:bg-violet-900 dark:group-[.toast]:text-violet-200",
          cancelButton:
            "group-[.toast]:bg-zinc-200 group-[.toast]:text-zinc-700 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-zinc-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
