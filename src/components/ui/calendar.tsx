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
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 rounded-md shadow-md bg-background pointer-events-auto",
        className
      )}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-2",
        caption: "flex justify-center items-center relative",
        caption_label: "text-base font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7",
        head_cell:
          "text-muted-foreground text-sm font-medium text-center py-2",
        row: "grid grid-cols-7",
        cell: "text-center align-middle p-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md mx-auto text-sm aria-selected:opacity-100 flex items-center justify-center"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary focus:bg-primary focus:text-primary-foreground rounded-md",
        day_today:
          "font-semibold text-accent-foreground border border-accent",
        day_outside:
          "text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_hidden: "invisible",
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
