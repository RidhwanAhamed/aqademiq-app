"use client"
import { DatePicker } from "@ark-ui/react/date-picker"
import { Portal } from "@ark-ui/react/portal"
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArkDatePickerProps {
  value?: Date
  onValueChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ArkDatePicker({ 
  value, 
  onValueChange, 
  placeholder = "Pick a date",
  disabled = false,
  className 
}: ArkDatePickerProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  return (
    <DatePicker.Root
      value={value ? [formatDate(value)!] as any : undefined}
      onValueChange={(details: any) => {
        const dateStr = details.valueAsString?.[0];
        onValueChange?.(dateStr ? new Date(dateStr) : undefined);
      }}
      disabled={disabled}
    >
      <DatePicker.Control className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary",
        className
      )}>
        <DatePicker.Input className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" placeholder={placeholder} />
        <DatePicker.Trigger className="p-2 rounded-lg hover:bg-accent"><Calendar size={18} /></DatePicker.Trigger>
        <DatePicker.ClearTrigger className="p-2 rounded-lg text-destructive hover:bg-destructive/10"><X size={16} /></DatePicker.ClearTrigger>
      </DatePicker.Control>

      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content className="z-50 mt-2 w-auto max-w-sm rounded-2xl border border-border bg-card shadow-xl p-3">
            <div className="flex gap-2 mb-3">
              <DatePicker.YearSelect className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm" />
              <DatePicker.MonthSelect className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm" />
            </div>

            <DatePicker.View view="day">
              <DatePicker.Context>
                {(api: any) => (
                  <>
                    <DatePicker.ViewControl className="flex justify-between items-center mb-2">
                      <DatePicker.PrevTrigger className="p-1 rounded-lg hover:bg-accent"><ChevronLeft size={18} /></DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger className="px-2 py-1 rounded-md hover:bg-accent"><DatePicker.RangeText /></DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger className="p-1 rounded-lg hover:bg-accent"><ChevronRight size={18} /></DatePicker.NextTrigger>
                    </DatePicker.ViewControl>
                    <DatePicker.Table className="w-full text-sm">
                      <DatePicker.TableHead>
                        <DatePicker.TableRow className="flex gap-1">
                          {api.weekDays.map((day: any, i: number) => <DatePicker.TableHeader key={i} className="w-9 text-muted-foreground">{day.short}</DatePicker.TableHeader>)}
                        </DatePicker.TableRow>
                      </DatePicker.TableHead>
                      <DatePicker.TableBody>
                        {api.weeks.map((week: any, i: number) => (
                          <DatePicker.TableRow key={i} className="flex gap-1 mt-1">
                            {week.map((day: any, j: number) => (
                              <DatePicker.TableCell key={j} value={day}>
                                <DatePicker.TableCellTrigger className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent data-[selected]:bg-primary data-[selected]:text-primary-foreground">{day.day}</DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  )
}
