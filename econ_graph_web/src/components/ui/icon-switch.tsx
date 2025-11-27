import type React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface IconSwitchOption<T extends string> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

interface IconSwitchProps<T extends string> {
  options: IconSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function IconSwitch<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: IconSwitchProps<T>) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className={`inline-flex items-center gap-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/40 p-0.5 ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <Tooltip.Root key={option.value}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`p-1 rounded transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {option.icon}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="px-2 py-1 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded shadow-lg z-[9999]"
                  sideOffset={5}
                  collisionPadding={10}
                >
                  {option.label}
                  <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-700" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}
