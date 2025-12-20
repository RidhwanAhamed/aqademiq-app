import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookOpen, FileText, Library } from "lucide-react";
import type { DepthLevel } from "@/types/cornell";

interface DepthSelectorProps {
  value: DepthLevel;
  onChange: (value: DepthLevel) => void;
}

const depthOptions = [
  {
    value: "brief" as DepthLevel,
    label: "Brief",
    description: "1-2 pages • Quick overview, key concepts only",
    icon: FileText,
  },
  {
    value: "standard" as DepthLevel,
    label: "Standard",
    description: "2-4 pages • Balanced coverage with details",
    icon: BookOpen,
  },
  {
    value: "comprehensive" as DepthLevel,
    label: "Comprehensive",
    description: "4-10 pages • Deep dive with extensive details",
    icon: Library,
  },
];

export function DepthSelector({ value, onChange }: DepthSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">
        Depth Level
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as DepthLevel)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {depthOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <div key={option.value}>
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.value}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer
                  transition-all duration-200
                  ${isSelected 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-xs text-muted-foreground text-center leading-tight">
                  {option.description}
                </span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
