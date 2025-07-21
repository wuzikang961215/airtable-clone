"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (newValue: string) => void;
  onBlur: () => void;
};

export const CellEditor = ({ value, onChange, onBlur }: Props) => {
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

  return (
    <input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full h-full bg-white border-none outline-none px-0.5 text-sm"
    />
  );
};
