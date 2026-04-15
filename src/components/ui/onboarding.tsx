"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Context ────────────────────────────────────────────────────────────────────

type OnboardingCtx = {
  step: number;
  stepValue: number;
  setStepValue: (v: number) => void;
  totalSteps: number;
  maxStepValue: number;
  canGoNextFn: (step: number, stepValue: number) => boolean;
  goNext: () => void;
  goBack: () => void;
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingCtx | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within <Onboarding>");
  return ctx;
}

// ── Root ───────────────────────────────────────────────────────────────────────

type OnboardingProps = {
  totalSteps: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (step: number) => void;
  maxStepValue?: number;
  canGoNext?: (step: number, stepValue: number) => boolean;
  onComplete?: () => void;
  children: React.ReactNode;
};

function OnboardingRoot({
  totalSteps,
  value,
  defaultValue = 1,
  onValueChange,
  maxStepValue = 0,
  canGoNext = () => true,
  onComplete,
  children,
}: OnboardingProps) {
  const [internalStep, setInternalStep] = useState(defaultValue);
  const [stepValue, setStepValue] = useState(0);

  // Keep canGoNext fresh without needing it in useCallback deps
  const canGoNextRef = useRef(canGoNext);
  useEffect(() => {
    canGoNextRef.current = canGoNext;
  }, [canGoNext]);

  const step = value ?? internalStep;

  const setStep = useCallback(
    (s: number) => {
      setInternalStep(s);
      onValueChange?.(s);
    },
    [onValueChange]
  );

  const goNext = useCallback(() => {
    if (!canGoNextRef.current(step, stepValue)) return;
    if (step === 1 && stepValue < maxStepValue) {
      setStepValue((v) => v + 1);
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
      setStepValue(0);
    } else {
      onComplete?.();
    }
  }, [step, stepValue, maxStepValue, totalSteps, setStep, onComplete]);

  const goBack = useCallback(() => {
    if (step === 1 && stepValue > 0) {
      setStepValue((v) => v - 1);
      return;
    }
    if (step > 1) {
      setStep(step - 1);
      setStepValue(0);
    }
  }, [step, stepValue, setStep]);

  const complete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <OnboardingContext.Provider
      value={{
        step,
        stepValue,
        setStepValue,
        totalSteps,
        maxStepValue,
        canGoNextFn: canGoNext,
        goNext,
        goBack,
        complete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// ── Step ───────────────────────────────────────────────────────────────────────

type StepRenderProps = { stepValue: number; setStepValue: (v: number) => void };
type StepChildren = React.ReactNode | ((props: StepRenderProps) => React.ReactNode);

function Step({ step, children }: { step: number; children: StepChildren }) {
  const { step: current, stepValue, setStepValue } = useOnboarding();
  if (current !== step) return null;
  return (
    <>
      {typeof children === "function"
        ? children({ stepValue, setStepValue })
        : children}
    </>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

function Header({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  if (children) return <div className="mb-6 text-center">{children}</div>;
  return (
    <div className="mb-7 text-center">
      {title && (
        <h2 className="text-2xl font-semibold text-[#040404]">{title}</h2>
      )}
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6B6487]">
          {description}
        </p>
      )}
    </div>
  );
}

// ── StepIndicator ──────────────────────────────────────────────────────────────

function StepIndicator({
  variant = "dots",
  dotClassName,
}: {
  variant?: "dots" | "pills";
  dotClassName?: string;
}) {
  const { step, totalSteps } = useOnboarding();

  if (variant === "pills") {
    return (
      <div className="mb-8 flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step
                ? "w-8 bg-[#5F30EB]"
                : i + 1 < step
                  ? "w-4 bg-[#5F30EB]/50"
                  : "w-4 bg-[#E6E1FA]"
            } ${dotClassName ?? ""}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8 flex justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-all duration-300 ${
            i + 1 === step
              ? "scale-125 bg-[#5F30EB]"
              : i + 1 < step
                ? "bg-[#5F30EB]/50"
                : "bg-[#E6E1FA]"
          } ${dotClassName ?? ""}`}
        />
      ))}
    </div>
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────────

function Navigation({
  backLabel = "Back",
  nextLabel = "Next",
  completeLabel = "Get Started",
  canGoNext: canGoNextOverride,
  children,
}: {
  backLabel?: string;
  nextLabel?: string;
  completeLabel?: string;
  canGoNext?: boolean;
  children?: React.ReactNode;
}) {
  const { step, stepValue, totalSteps, canGoNextFn, goNext, goBack } =
    useOnboarding();

  const isFirst = step === 1 && stepValue === 0;
  const isLast = step === totalSteps;
  const nextEnabled =
    canGoNextOverride !== undefined
      ? canGoNextOverride
      : canGoNextFn(step, stepValue);

  if (children) {
    return (
      <div className="mt-8 flex items-center justify-between border-t border-[#E6E1FA] pt-4">
        {children}
      </div>
    );
  }

  return (
    <div className="mt-8 flex items-center justify-between border-t border-[#E6E1FA] pt-4">
      <button
        type="button"
        onClick={goBack}
        disabled={isFirst}
        className="rounded-xl border border-[#E6E1FA] px-5 py-2.5 text-sm font-medium text-[#6B6487] transition-colors hover:bg-[#F0EBFF] hover:text-[#5F30EB] disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={!nextEnabled}
        className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#5F30EB] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLast ? completeLabel : nextLabel}
        {!isLast && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── FeatureCarousel ─────────────────────────────────────────────────────────────

type CarouselCtx = {
  activeIndex: number;
  setActiveIndex: (i: number) => void;
};
const CarouselContext = createContext<CarouselCtx | null>(null);

function FeatureCarouselRoot({
  value,
  defaultValue = 0,
  onValueChange,
  children,
}: {
  value?: number;
  defaultValue?: number;
  onValueChange?: (i: number) => void;
  totalItems?: number;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const activeIndex = value ?? internal;
  const setActiveIndex = useCallback(
    (i: number) => {
      setInternal(i);
      onValueChange?.(i);
    },
    [onValueChange]
  );

  return (
    <CarouselContext.Provider value={{ activeIndex, setActiveIndex }}>
      <div className="flex flex-col gap-3">{children}</div>
    </CarouselContext.Provider>
  );
}

function FeatureCarouselItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const ctx = useContext(CarouselContext);
  if (!ctx)
    throw new Error("FeatureCarousel.Item must be inside FeatureCarousel");
  const { activeIndex, setActiveIndex } = ctx;
  const isActive = activeIndex === index;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveIndex(index)}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200 ${
        isActive
          ? "border-[#5F30EB] bg-[#F0EBFF] shadow-[0_4px_16px_rgba(95,48,235,0.12)]"
          : "border-[#E6E1FA] bg-white hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
      }`}
    >
      {children}
    </button>
  );
}

export const FeatureCarousel = Object.assign(FeatureCarouselRoot, {
  Item: FeatureCarouselItem,
});

// ── ChoiceGroup ────────────────────────────────────────────────────────────────

type ChoiceCtx = {
  name: string;
  selectedValue: string | null;
  setSelectedValue: (v: string) => void;
};
const ChoiceContext = createContext<ChoiceCtx | null>(null);

function ChoiceGroupRoot({
  name,
  value,
  defaultValue = null,
  onValueChange,
  orientation = "grid",
  children,
}: {
  name: string;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (v: string) => void;
  orientation?: "horizontal" | "vertical" | "grid";
  children: React.ReactNode;
}) {
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const selectedValue = value !== undefined ? value : internal;

  const setSelectedValue = useCallback(
    (v: string) => {
      setInternal(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  const layoutCls =
    orientation === "grid"
      ? "grid grid-cols-2 gap-3"
      : orientation === "horizontal"
        ? "flex flex-row flex-wrap gap-3"
        : "flex flex-col gap-3";

  return (
    <ChoiceContext.Provider value={{ name, selectedValue, setSelectedValue }}>
      <div role="radiogroup" aria-label={name} className={layoutCls}>
        {children}
      </div>
    </ChoiceContext.Provider>
  );
}

function ChoiceGroupItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(ChoiceContext);
  if (!ctx) throw new Error("ChoiceGroup.Item must be inside ChoiceGroup");
  const { name, selectedValue, setSelectedValue } = ctx;
  const isSelected = selectedValue === value;

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all duration-200 ${
        isSelected
          ? "border-[#5F30EB] bg-[#F0EBFF] shadow-[0_4px_16px_rgba(95,48,235,0.12)]"
          : "border-[#E6E1FA] bg-white hover:border-[#5F30EB]/30 hover:bg-[#F8F7FF]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={() => setSelectedValue(value)}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          isSelected ? "border-[#5F30EB] bg-[#5F30EB]" : "border-[#C8C0E8]"
        }`}
      >
        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span
        className={`text-sm font-medium ${isSelected ? "text-[#5F30EB]" : "text-[#040404]"}`}
      >
        {children}
      </span>
    </label>
  );
}

export const ChoiceGroup = Object.assign(ChoiceGroupRoot, {
  Item: ChoiceGroupItem,
});

// ── TipsList ────────────────────────────────────────────────────────────────────

function TipsListRoot({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {title && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#5F30EB]">
          {title}
        </p>
      )}
      <ol className="flex flex-col gap-4">{children}</ol>
    </div>
  );
}

function TipsListItem({
  number,
  children,
}: {
  number?: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      {number !== undefined && (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0EBFF] text-xs font-semibold text-[#5F30EB]">
          {number}
        </span>
      )}
      <p className="text-sm leading-relaxed text-[#4F4A67]">{children}</p>
    </li>
  );
}

export const TipsList = Object.assign(TipsListRoot, {
  Item: TipsListItem,
});

// ── Onboarding (composed export) ───────────────────────────────────────────────

export const Onboarding = Object.assign(OnboardingRoot, {
  Step,
  Header,
  Navigation,
  StepIndicator,
});
