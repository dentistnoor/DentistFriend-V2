"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  name?: string;
  tabIndex?: number;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className,
  required,
  name,
  tabIndex,
}: DateInputProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? parse(value, "yyyy-MM-dd", new Date()) : undefined,
  );
  const [inputValue, setInputValue] = React.useState(
    value ? format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "",
  );

  React.useEffect(() => {
    if (value) {
      const parsedDate = parse(value, "yyyy-MM-dd", new Date());
      setDate(parsedDate);
      setInputValue(format(parsedDate, "dd/MM/yyyy"));
    } else {
      setDate(undefined);
      setInputValue("");
    }
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const formattedDate = format(selectedDate, "dd/MM/yyyy");
      const isoDate = format(selectedDate, "yyyy-MM-dd");
      setInputValue(formattedDate);
      onChange?.(isoDate);
    } else {
      setInputValue("");
      onChange?.("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setInputValue(inputVal);

    // Try to parse the input as DD/MM/YYYY
    if (inputVal.length === 10) {
      try {
        const parsedDate = parse(inputVal, "dd/MM/yyyy", new Date());
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
          const isoDate = format(parsedDate, "yyyy-MM-dd");
          onChange?.(isoDate);
        }
      } catch {
        // Invalid date format, ignore
      }
    }
  };

  return (
    <div className="relative">
      <Input
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn("pr-10", className)}
        required={required}
        tabIndex={tabIndex}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "absolute right-0 top-0 h-full px-3 py-2",
              "border-l-0 rounded-l-none",
            )}
            tabIndex={-1}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
