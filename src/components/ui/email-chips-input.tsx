import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "./input";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface EmailChipsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailChipsInput: React.FC<EmailChipsInputProps> = ({
  value,
  onChange,
  placeholder = "Enter email and press Enter",
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (!emailRegex.test(trimmed)) {
      setError("Invalid email format");
      return;
    }

    if (value.includes(trimmed)) {
      setError("Email already added");
      return;
    }

    setError(null);
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(value.filter((e) => e !== emailToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const emails = pastedText.split(/[,;\s]+/).filter(Boolean);

    const validEmails: string[] = [];
    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      if (emailRegex.test(trimmed) && !value.includes(trimmed) && !validEmails.includes(trimmed)) {
        validEmails.push(trimmed);
      }
    }

    if (validEmails.length > 0) {
      onChange([...value, ...validEmails]);
      setError(null);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[42px]",
          error && "border-destructive",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {value.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-xs"
          >
            {email}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 hover:text-destructive focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          type="email"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[150px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
