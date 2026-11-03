'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/forms';
import { buttonClass } from '@/components/ui';

export function SubmitButton({ children, className = buttonClass }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? 'Saving…' : children}
    </button>
  );
}

/** A submit button that asks for confirmation first. */
export function ConfirmButton({ children, message, className }: { children: ReactNode; message: string; className: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** A form for adding things: clears its fields after a successful save so the same entry isn't added twice. */
export function AddForm({
  action,
  children,
  className,
}: {
  action: (form: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      className={className}
      action={async (form) => {
        await action(form);
        formRef.current?.reset();
      }}
    >
      {children}
    </form>
  );
}

/** A form whose action returns { error } or { success }, shown under the fields. */
export function StatefulForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
