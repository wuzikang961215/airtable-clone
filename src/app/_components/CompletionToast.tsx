"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { CheckCircle, X } from "lucide-react";

type Props = {
  message: string;
  count: number;
  onClose: () => void;
};

export const CompletionToast = ({ message, count, onClose }: Props) => {
  useEffect(() => {
    // Auto close after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div 
      className="fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in"
      style={{ zIndex: 100000 }}
    >
      <CheckCircle className="w-5 h-5" />
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        <p className="text-sm opacity-90">{count.toLocaleString()} rows added to the table</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-green-700 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
};