"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Loader2, CheckCircle } from "lucide-react";

type Props = {
  isInserting: boolean;
  progress: { current: number; total: number; tableId: string } | null;
};

export const BulkInsertProgress = ({ isInserting, progress }: Props) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [lastCompletedCount, setLastCompletedCount] = useState<number | null>(null);
  const isComplete = progress && progress.current >= progress.total && progress.current > 0;
  
  useEffect(() => {
    if (isComplete && progress) {
      setShowCompleted(true);
      setLastCompletedCount(progress.total);
      // Hide after 3 seconds when complete
      const timer = setTimeout(() => {
        setShowCompleted(false);
        setLastCompletedCount(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, progress]);
  
  // Show if inserting, has progress (but not complete), or showing completion
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const shouldShow = isInserting || (progress && !isComplete) || showCompleted;
  if (!shouldShow) return null;
  
  // Use last completed count if showing completion state
  const displayProgress = progress ?? (showCompleted && lastCompletedCount ? { current: lastCompletedCount, total: lastCompletedCount, tableId: "" } : null);
  const isShowingComplete = showCompleted && !progress;

  return ReactDOM.createPortal(
    <div 
      className={`fixed bottom-8 right-8 p-6 rounded-lg shadow-2xl min-w-[350px] border transition-all duration-300 ${
        isShowingComplete 
          ? "bg-green-50 border-green-200" 
          : "bg-white border-gray-200"
      }`}
      style={{ zIndex: 99999 }}
    >
      <div className="flex items-center gap-3 mb-4">
        {isShowingComplete ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        )}
        <div>
          <p className="font-semibold">
            {isShowingComplete ? "Successfully added" : "Adding"} {displayProgress?.total.toLocaleString() ?? "rows"}{isShowingComplete ? "!" : "..."}
          </p>
          <p className="text-sm text-gray-500">
            {isShowingComplete ? "All rows have been inserted" : "Please wait while we insert the rows"}
          </p>
        </div>
      </div>
      {displayProgress ? (
        <div className="space-y-2">
          {!isShowingComplete && (
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">
                {displayProgress.current.toLocaleString()} / {displayProgress.total.toLocaleString()}
              </span>
            </div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isShowingComplete ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{ width: `${(displayProgress.current / displayProgress.total) * 100}%` }}
            />
          </div>
          <p className={`text-xs text-center ${
            isShowingComplete ? "text-green-600 font-medium" : "text-gray-500"
          }`}>
            {isShowingComplete 
              ? "✓ Completed successfully" 
              : `${Math.round((displayProgress.current / displayProgress.total) * 100)}% complete`
            }
          </p>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Initializing...</div>
      )}
    </div>,
    document.body
  );
};