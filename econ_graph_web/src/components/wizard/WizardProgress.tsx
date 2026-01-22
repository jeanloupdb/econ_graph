/**
 * Indicateur de progression du wizard (dots).
 * Style Linear.app : minimaliste et élégant.
 */

import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function WizardProgress({
  currentStep,
  totalSteps,
  className,
}: WizardProgressProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step <= currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Dot */}
            <div
              className={cn(
                'h-2 w-2 rounded-full transition-all duration-300',
                isActive
                  ? 'bg-violet-500'
                  : 'bg-zinc-700',
                isCurrent && 'scale-125'
              )}
            />
            {/* Line */}
            {step < totalSteps && (
              <div
                className={cn(
                  'h-[2px] w-8 transition-all duration-300',
                  isActive
                    ? 'bg-violet-500'
                    : 'bg-zinc-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
