import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Building2, Briefcase, 
  Smartphone, ChevronRight, ChevronLeft, X, Sparkles 
} from 'lucide-react';
import { cn } from '../utils/cn';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Home,
    title: "Welcome to DoorStep!",
    description: "Your all-in-one fundraising campaign manager. Track door-to-door visits, manage donations, and analyze your progress.",
    color: "bg-blue-500",
    tip: null
  },
  {
    icon: Building2,
    title: "Residential Campaigns",
    description: "Perfect for weekend door-to-door visits in apartments. Create buildings, track floors and units, and log donations.",
    color: "bg-emerald-500",
    tip: "🏠 Best for weekends"
  },
  {
    icon: Briefcase,
    title: "Corporate Campaigns",
    description: "For weekday business visits. Track companies, schedule follow-ups, and manage pledges from corporate donors.",
    color: "bg-purple-500",
    tip: "💼 Best for weekdays"
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Swipe cards left or right to quickly update status. Use voice input for notes. Works offline!",
    color: "bg-pink-500",
    tip: "👆 Swipe to update"
  },
  {
    icon: Sparkles,
    title: "You're All Set!",
    description: "Start by selecting Residential or Corporate mode. Good luck with your fundraising campaign!",
    color: "bg-indigo-500",
    tip: "🎉 Let's go!"
  }
];

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Skip button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium flex items-center gap-1"
          >
            Skip <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg",
                step.color
              )}>
                <Icon size={40} />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                {step.title}
              </h2>

              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
              
              {step.tip && (
                <div className="mt-4 inline-block px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                  {step.tip}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "w-6 bg-blue-500" 
                    : "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                "flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-blue-900/50",
                currentStep === 0 && "flex-[2]"
              )}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"} 
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
