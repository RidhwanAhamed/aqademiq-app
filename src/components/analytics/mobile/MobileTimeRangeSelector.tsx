import { cn } from "@/lib/utils";

export type TimeRange = "week" | "month" | "3months";

interface MobileTimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const options: { value: TimeRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "3months", label: "3 Months" },
];

export function MobileTimeRangeSelector({ value, onChange }: MobileTimeRangeSelectorProps) {
  return (
    <div className="flex gap-1 px-4 py-2 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      <div className="flex w-full bg-muted/40 rounded-xl p-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-200",
              "touch-target active-scale",
              value === option.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
