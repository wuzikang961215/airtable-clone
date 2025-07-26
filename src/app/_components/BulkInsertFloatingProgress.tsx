"use client";

import React from "react";
import ReactDOM from "react-dom";
import { Loader2 } from "lucide-react";

type Props = {
  progress: { current: number; total: number; tableId: string } | null;
};

export const BulkInsertFloatingProgress = ({ progress }: Props) => {
  if (!progress || progress.current >= progress.total) return null;

  const percent = Math.round((progress.current / progress.total) * 100);
  const formatNumber = (num: number) => num.toLocaleString();

  return ReactDOM.createPortal(
    <div 
      className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px]"
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-start gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900">
            Adding {formatNumber(progress.total)} rows
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Progress: {formatNumber(progress.current)} / {formatNumber(progress.total)}
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {percent}% complete
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};