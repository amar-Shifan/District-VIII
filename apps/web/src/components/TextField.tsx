import { type InputHTMLAttributes, useId } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Dark customer-app input with a visible label and an inline, announced error. */
export function TextField({ label, error, hint, className = "", ...input }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-bold tracking-[0.2em] text-blush uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`h-13 w-full rounded-2xl border bg-white/6 px-4 text-base text-white transition-colors outline-none placeholder:text-blush/50 focus:border-blush focus:ring-2 focus:ring-burgundy-bright/60 ${
          error ? "border-burgundy-bright" : "border-white/15"
        }`}
        {...input}
      />
      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={`mt-1.5 text-xs ${error ? "font-semibold text-white" : "text-blush/80"}`}
        >
          {error && (
            <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-burgundy-bright align-middle" />
          )}
          {message}
        </p>
      )}
    </div>
  );
}
