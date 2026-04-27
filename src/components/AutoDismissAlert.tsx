"use client";

import { useEffect, useState } from "react";

interface AutoDismissAlertProps {
  message: string;
  className?: string;
  durationMs?: number;
}

export function AutoDismissAlert({
  message,
  className = "",
  durationMs = 4000,
}: AutoDismissAlertProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsLeaving(false);
    setIsVisible(true);

    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, durationMs);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, durationMs + 300);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message, durationMs]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${className} transition-all duration-300 ${isLeaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}
    >
      {message}
    </div>
  );
}
