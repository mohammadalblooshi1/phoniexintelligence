import type { FormState } from "@/lib/actions/public";

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state?.errors?.[name];
  return msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-lg border p-3 text-sm ${state.ok ? "border-ok text-ok" : "border-danger text-danger"}`}>
      {state.message}
    </p>
  );
}

export function Honeypot() {
  return (
    <div aria-hidden className="hidden">
      <label>
        Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
