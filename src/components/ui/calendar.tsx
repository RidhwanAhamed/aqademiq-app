import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Use DayPicker's default classNames so v9 provides the correct grid layout,
  // then layer our custom styles on top.
  const defaultClassNames = (DayPicker as any).defaultProps?.classNames ?? {};

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        ...defaultClassNames,
        // v9 uses `day_button` for the clickable element; keep layout from defaults
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md"
        ),
        today: cn("bg-accent text-accent-foreground rounded-md"),
        outside: cn(
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30"
        ),
        disabled: cn("text-muted-foreground opacity-50"),
        hidden: cn("invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...props} />
          ) : (
            <ChevronRight className="h-4 w-4" {...props} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
