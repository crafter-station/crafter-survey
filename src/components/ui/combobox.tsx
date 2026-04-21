"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción...",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="survey-input flex w-full items-center justify-between text-left text-base"
        >
          <span className={selectedOption ? "text-base text-foreground" : "text-base text-muted-foreground"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={[
              "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
              open ? "rotate-180" : ""
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b border-border px-4 py-3">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full bg-transparent text-base outline-none placeholder:text-base placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="relative flex w-full cursor-pointer select-none items-center px-4 py-3 text-base outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="flex-1 text-left">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-2 h-4 w-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
