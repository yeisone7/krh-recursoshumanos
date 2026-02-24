import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface TrainingStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function TrainingStepIndicator({ steps, currentStep }: TrainingStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                index < currentStep && 'bg-primary border-primary text-primary-foreground',
                index === currentStep && 'border-primary text-primary bg-primary/10',
                index > currentStep && 'border-muted-foreground/30 text-muted-foreground/50',
              )}
            >
              {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
            </div>
            <span
              className={cn(
                'text-xs mt-1.5 text-center max-w-[80px]',
                index <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2 mt-[-16px]',
                index < currentStep ? 'bg-primary' : 'bg-muted-foreground/20',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
