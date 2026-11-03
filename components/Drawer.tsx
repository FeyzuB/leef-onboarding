'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * A button that opens a panel sliding in from the right, for editing without leaving the list.
 * Give it a `key` that changes when the edited thing is saved (e.g. its version): the drawer then
 * remounts closed, so a successful save closes it.
 * The panel is rendered on <body> (a portal), so a hover-hidden or transformed parent of the button
 * can't hide it or squeeze it into the parent's box.
 */
export function Drawer({
  title,
  trigger,
  triggerClassName,
  triggerLabel,
  wide = false,
  children,
}: {
  title: string;
  trigger: ReactNode;
  triggerClassName: string;
  triggerLabel?: string;
  /** A wider panel, for forms with a lot of text such as steps. */
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 cursor-default bg-slate-900/30 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
            />
            <div className={`relative flex h-full w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} flex-col bg-white shadow-2xl`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
