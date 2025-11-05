import * as React from "react";
import { useState } from "react";
import DatePicker from "react-datepicker";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";

interface CalendarDatePickerProps {
  label?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
}

export function CalendarDatePicker({
  label,
  selected,
  onChange,
  placeholder = "Pick a date",
  className,
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          onChange(date);
          setIsOpen(false);
        }}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        withPortal
        portalId="calendar-datepicker-portal"
        customInput={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg",
              "bg-background border border-input",
              "text-foreground text-sm",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "transition-colors duration-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {selected ? format(selected, "MMMM dd, yyyy") : placeholder}
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </button>
        }
        calendarClassName="custom-datepicker"
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className={cn(
                "p-1.5 rounded-md hover:bg-accent transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-sm font-semibold text-foreground">
              {format(date, "MMMM yyyy")}
            </span>
            
            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className={cn(
                "p-1.5 rounded-md hover:bg-accent transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        formatWeekDay={(day) => day.charAt(0)}
        calendarStartDay={0}
      />
      
      <style>{`
        .custom-datepicker {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          font-family: inherit;
          margin-top: 0.5rem;
          overflow: hidden;
          animation: slideDown 150ms ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .react-datepicker__month-container {
          width: 100%;
        }

        .react-datepicker__month {
          margin: 0;
          padding: 1rem;
        }

        .react-datepicker__week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
        }

        .react-datepicker__day-names {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
          margin-bottom: 0.5rem;
          padding: 0 1rem;
        }

        .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
          padding: 0.5rem 0;
          margin: 0;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .react-datepicker__day {
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          text-align: center;
          padding: 0;
          margin: 0;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 150ms ease;
          border: none;
          background: transparent;
        }

        .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .react-datepicker__day--selected {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          font-weight: 600;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .react-datepicker__day--selected:hover {
          background-color: hsl(var(--primary)) !important;
          opacity: 0.9;
        }

        .react-datepicker__day--today {
          font-weight: 600;
          border: 1px solid hsl(var(--primary));
        }

        .react-datepicker__day--keyboard-selected {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
        }

        .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.3;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }

        .react-datepicker__triangle {
          display: none;
        }

        .react-datepicker-popper {
          z-index: 9999 !important;
        }

        .react-datepicker__portal {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
}
