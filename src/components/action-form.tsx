"use client";

import { startTransition } from "react";

/**
 * Form that submits to a server action without React's automatic reset, so
 * users keep what they typed when the server returns a validation error.
 */
export function ActionForm({
  action,
  children,
  ...rest
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  return (
    <form
      {...rest}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {children}
    </form>
  );
}
