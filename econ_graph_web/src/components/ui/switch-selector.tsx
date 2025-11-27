import type React from "react";

interface SwitchOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SwitchSelectorProps<T extends string> {
  options: SwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md" | "lg";
}

export function SwitchSelector<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: SwitchSelectorProps<T>) {
  const sizeClasses = {
    sm: {
      container: "p-0.5 gap-0.5 h-auto",
      button: "px-2 py-1 text-xs",
      icon: "h-3.5 w-3.5",
    },
    md: {
      container: "p-0.5 gap-0.5 h-auto",
      button: "px-2 py-0.5 text-xs",
      icon: "h-4 w-4",
    },
    lg: {
      container: "p-0.5 gap-0.5 h-auto",
      button: "px-3 py-1 text-sm",
      icon: "h-4 w-4",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-900/50 ${classes.container}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
              classes.button
            } ${
              isActive
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {option.icon && (
              <span className={classes.icon}>{option.icon}</span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
