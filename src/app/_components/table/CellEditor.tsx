"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (newValue: string) => void;
  onBlur: () => void;
  columnType?: string;
};

export const CellEditor = ({ value, onChange, onBlur, columnType }: Props) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBlur = () => {
    if (inputValue !== value) {
      onChange(inputValue);
    }
    onBlur();
  };

  const isValidNumberInput = (str: string): boolean => {
    if (str === "") return true;
    
    // Valid patterns for number input
    const validPatterns = [
      /^-?$/,           // Just minus sign
      /^-?\d+$/,        // Integer
      /^-?\d*\.$/,      // Number with trailing decimal
      /^-?\d*\.\d+$/,   // Decimal number
      /^-?\.\d+$/,      // Starting with decimal (e.g., .5)
    ];
    
    return validPatterns.some(pattern => pattern.test(str));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (columnType !== "number") return;

    // Allow control keys
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "Home", "End", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"
    ];
    
    if (allowedKeys.includes(e.key)) return;

    // Allow Ctrl/Cmd + A/C/V/X (select all, copy, paste, cut)
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) {
      return;
    }

    const input = e.currentTarget;
    const { selectionStart, selectionEnd } = input;
    
    if (selectionStart === null || selectionEnd === null) return;

    // Simulate what the value would be after this keypress
    const currentValue = input.value;
    const beforeCursor = currentValue.slice(0, selectionStart);
    const afterCursor = currentValue.slice(selectionEnd);
    const newValue = beforeCursor + e.key + afterCursor;

    // Only allow the keypress if it would result in a valid number input
    if (!isValidNumberInput(newValue)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (columnType !== "number") return;

    e.preventDefault();
    
    const pastedText = e.clipboardData.getData("text");
    const input = e.currentTarget;
    const { selectionStart, selectionEnd } = input;
    
    if (selectionStart === null || selectionEnd === null) return;

    // Simulate what the value would be after paste
    const currentValue = input.value;
    const beforeCursor = currentValue.slice(0, selectionStart);
    const afterCursor = currentValue.slice(selectionEnd);
    const newValue = beforeCursor + pastedText + afterCursor;

    // Only allow paste if it results in a valid number
    if (isValidNumberInput(newValue)) {
      setInputValue(newValue);
      
      // Set cursor position after paste
      setTimeout(() => {
        const newCursorPos = beforeCursor.length + pastedText.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For number columns, we validate in onKeyDown and onPaste
    // This is a fallback for any edge cases
    if (columnType === "number") {
      if (isValidNumberInput(e.target.value)) {
        setInputValue(e.target.value);
      }
    } else {
      setInputValue(e.target.value);
    }
  };

  return (
    <input
      ref={inputRef}
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={handleBlur}
      type="text"
      inputMode={columnType === "number" ? "decimal" : "text"}
      className="w-full h-full bg-white border-none outline-none px-2 text-[13px] text-[#333333]"
    />
  );
};
