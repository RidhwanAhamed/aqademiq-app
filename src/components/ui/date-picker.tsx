"use client"
import { DatePicker } from "@ark-ui/react/date-picker"
import { Portal } from "@ark-ui/react/portal"
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react"

export const Basic = () => {
  return (
    <div className="w-full max-w-md mx-auto p-4">
      <DatePicker.Root>
        <DatePicker.Label className="block mb-2 text-sm font-medium text-foreground">
          Select Date
        </DatePicker.Label>

        {/* Input + Controls */}
        <DatePicker.Control className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary">
          <DatePicker.Input
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Pick a date"
          />
          <DatePicker.Trigger className="p-2 rounded-lg hover:bg-accent">
            <Calendar size={18} />
          </DatePicker.Trigger>
          <DatePicker.ClearTrigger className="p-2 rounded-lg text-destructive hover:bg-destructive/10">
            <X size={16} />
          </DatePicker.ClearTrigger>
        </DatePicker.Control>

        {/* Calendar Popup */}
        <Portal>
          <DatePicker.Positioner>
            <DatePicker.Content className="mt-2 w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-3">
              
              {/* Year + Month Select */}
              <div className="flex gap-2 mb-3">
                <DatePicker.YearSelect className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" />
                <DatePicker.MonthSelect className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" />
              </div>

              {/* Day View */}
              <DatePicker.View view="day">
                <DatePicker.Context>
                  {(datePicker) => (
                    <>
                      <DatePicker.ViewControl className="flex justify-between items-center mb-2 text-sm font-medium text-foreground">
                        <DatePicker.PrevTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronLeft size={18} />
                        </DatePicker.PrevTrigger>
                        <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded-md hover:bg-accent">
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronRight size={18} />
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>

                      <DatePicker.Table className="w-full text-center text-sm">
                        <DatePicker.TableHead>
                          <DatePicker.TableRow>
                            {datePicker.weekDays.map((weekDay, id) => (
                              <DatePicker.TableHeader
                                key={id}
                                className="py-1 text-muted-foreground"
                              >
                                {weekDay.short}
                              </DatePicker.TableHeader>
                            ))}
                          </DatePicker.TableRow>
                        </DatePicker.TableHead>
                        <DatePicker.TableBody>
                          {datePicker.weeks.map((week, id) => (
                            <DatePicker.TableRow key={id}>
                              {week.map((day, id) => (
                                <DatePicker.TableCell key={id} value={day}>
                                  <DatePicker.TableCellTrigger
                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent data-[selected]:bg-primary data-[selected]:text-primary-foreground focus:ring-2 focus:ring-primary"
                                  >
                                    {day.day}
                                  </DatePicker.TableCellTrigger>
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

              {/* Month View */}
              <DatePicker.View view="month">
                <DatePicker.Context>
                  {(datePicker) => (
                    <>
                      <DatePicker.ViewControl className="flex justify-between items-center mb-2">
                        <DatePicker.PrevTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronLeft size={18} />
                        </DatePicker.PrevTrigger>
                        <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded-md hover:bg-accent">
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronRight size={18} />
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>
                      <DatePicker.Table className="w-full text-sm">
                        <DatePicker.TableBody>
                          {datePicker.getMonthsGrid({ columns: 4, format: "short" }).map((months, id) => (
                            <DatePicker.TableRow key={id}>
                              {months.map((month, id) => (
                                <DatePicker.TableCell key={id} value={month.value}>
                                  <DatePicker.TableCellTrigger className="px-2 py-1 rounded-lg hover:bg-accent data-[selected]:bg-primary data-[selected]:text-primary-foreground">
                                    {month.label}
                                  </DatePicker.TableCellTrigger>
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

              {/* Year View */}
              <DatePicker.View view="year">
                <DatePicker.Context>
                  {(datePicker) => (
                    <>
                      <DatePicker.ViewControl className="flex justify-between items-center mb-2">
                        <DatePicker.PrevTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronLeft size={18} />
                        </DatePicker.PrevTrigger>
                        <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded-md hover:bg-accent">
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger className="p-1 rounded-lg hover:bg-accent">
                          <ChevronRight size={18} />
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>
                      <DatePicker.Table className="w-full text-sm">
                        <DatePicker.TableBody>
                          {datePicker.getYearsGrid({ columns: 4 }).map((years, id) => (
                            <DatePicker.TableRow key={id}>
                              {years.map((year, id) => (
                                <DatePicker.TableCell key={id} value={year.value}>
                                  <DatePicker.TableCellTrigger className="px-2 py-1 rounded-lg hover:bg-accent data-[selected]:bg-primary data-[selected]:text-primary-foreground">
                                    {year.label}
                                  </DatePicker.TableCellTrigger>
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
    </div>
  )
}
