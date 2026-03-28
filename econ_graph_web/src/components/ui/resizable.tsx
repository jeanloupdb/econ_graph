"use client"

import { Panel, PanelGroup as Group, PanelResizeHandle as Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      // Thin container, large invisible hit area via after pseudo-element
      "group relative flex w-px shrink-0 items-center justify-center bg-transparent",
      // Hit area: 32px wide centered on the 1px line
      "after:absolute after:inset-y-0 after:left-1/2 after:w-8 after:-translate-x-1/2",
      "focus-visible:outline-none",
      "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {/* Visual indicator: invisible → line on hover/drag */}
    <div className={cn(
      "pointer-events-none relative z-10 rounded-full transition-all duration-200 ease-out",
      "h-10 w-px bg-transparent",
      // Hover
      "group-data-[separator=hover]:h-20 group-data-[separator=hover]:w-[2px] group-data-[separator=hover]:bg-zinc-600",
      // Drag/active
      "group-data-[separator=active]:h-full group-data-[separator=active]:w-[2px] group-data-[separator=active]:bg-zinc-400",
    )}>
      {withHandle && (
        <div className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex flex-col items-center gap-[3px]",
          "opacity-0 transition-opacity duration-200",
          "group-data-[separator=hover]:opacity-100 group-data-[separator=active]:opacity-0",
        )}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-muted-foreground/60" />
          ))}
        </div>
      )}
    </div>
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
