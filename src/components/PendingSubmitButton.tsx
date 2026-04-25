"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

interface PendingSubmitButtonProps {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}

export function PendingSubmitButton({
  children,
  className,
  pendingLabel = "Working...",
  disabled = false,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={className}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}