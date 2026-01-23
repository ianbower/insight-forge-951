import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Assignment {
  id: string;
  allocation_percentage: number;
  start_date: string | null;
  end_date: string | null;
}

interface AvailabilityCalendarProps {
  assignments: Assignment[];
  totalAvailability: number;
}

export function AvailabilityCalendar({
  assignments,
  totalAvailability,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calculate utilization for a specific date
  const getUtilizationForDate = (date: Date): number => {
    const dateStart = startOfDay(date);
    
    return assignments.reduce((total, assignment) => {
      // Skip pipeline assignments (0% allocation)
      if (assignment.allocation_percentage === 0) return total;

      const assignmentStart = assignment.start_date
        ? startOfDay(new Date(assignment.start_date))
        : null;
      const assignmentEnd = assignment.end_date
        ? startOfDay(new Date(assignment.end_date))
        : null;

      // Check if date falls within assignment period
      // If no start_date, assume it started already (active)
      // If no end_date, assume it's ongoing
      const afterStart = !assignmentStart || !isBefore(dateStart, assignmentStart);
      const beforeEnd = !assignmentEnd || !isAfter(dateStart, assignmentEnd);

      if (afterStart && beforeEnd) {
        return total + assignment.allocation_percentage;
      }

      return total;
    }, 0);
  };

  // Get color based on utilization
  const getColorForUtilization = (utilization: number): string => {
    const remaining = totalAvailability - utilization;
    
    if (remaining >= 50) {
      return "bg-emerald-500"; // Green - fully available
    } else if (remaining >= 20) {
      return "bg-amber-500"; // Amber - partially utilized
    } else {
      return "bg-red-500"; // Red - fully utilized
    }
  };

  // Get padding days for the first week
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const paddingDays = Array(firstDayOfMonth).fill(null);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Availability Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding days */}
          {paddingDays.map((_, index) => (
            <div key={`pad-${index}`} className="aspect-square" />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const utilization = getUtilizationForDate(day);
            const color = getColorForUtilization(utilization);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-md text-xs relative",
                  isPast ? "opacity-40" : "",
                  isToday(day) && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0.5 rounded-md opacity-30",
                    color
                  )}
                />
                <span className="relative z-10 font-medium">{format(day, "d")}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-60" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500 opacity-60" />
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500 opacity-60" />
            <span className="text-xs text-muted-foreground">Fully Booked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
