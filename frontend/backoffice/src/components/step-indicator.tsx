'use client';

import { Text } from './text';

interface Step {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  active?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isPast = index < currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <Text
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </Text>
                  {step.description && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {step.description}
                    </Text>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all ${
                    isPast ? 'bg-green-600' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

