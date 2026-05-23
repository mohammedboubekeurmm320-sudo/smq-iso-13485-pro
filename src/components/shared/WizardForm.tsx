'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

interface WizardFormProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  title?: string;
  size?: 'default' | 'lg' | 'xl' | 'full';
  allowStepNavigation?: boolean;
}

const sizeClasses = {
  default: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-6xl',
};

export function WizardForm({
  steps,
  currentStep,
  onStepChange,
  children,
  onComplete,
  onCancel,
  isSubmitting = false,
  title,
  size = 'lg',
  allowStepNavigation = true,
}: WizardFormProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('flex flex-col h-full', sizeClasses[size])}>
      {/* Header */}
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => allowStepNavigation && idx < currentStep && onStepChange(idx)}
                disabled={!allowStepNavigation || idx > currentStep}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  idx < currentStep && 'text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20',
                  idx === currentStep && 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
                  idx > currentStep && 'text-gray-400 dark:text-gray-600 cursor-not-allowed',
                )}
              >
                {idx < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className={cn(
                    'flex items-center justify-center h-5 w-5 rounded-full text-xs border',
                    idx === currentStep
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400',
                  )}>
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2',
                  idx < currentStep ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
                )} />
              )}
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Current step description */}
        {steps[currentStep]?.description && (
          <p className="mt-2 text-sm text-muted-foreground">{steps[currentStep].description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto mb-6 min-h-0">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
        <div className="flex gap-2">
          {!isFirst && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onStepChange(currentStep - 1)}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              onClick={onComplete}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper hook for wizard state
export function useWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  return {
    currentStep,
    setCurrentStep,
    next,
    prev,
    goTo,
    reset,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    progress: ((currentStep + 1) / totalSteps) * 100,
  };
}
