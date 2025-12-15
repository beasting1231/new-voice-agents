import { useEffect, useId, type PropsWithChildren, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

export function Modal({ open, title, description, onClose, footer, children }: ModalProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      <button type="button" className="ui-modal__backdrop" onClick={onClose} aria-label="Close dialog" />
      <div className="ui-modal__panel">
        <div className="ui-modal__header">
          <div className="ui-modal__title" id={titleId}>
            {title}
          </div>
          {description && (
            <div className="ui-modal__description" id={descId}>
              {description}
            </div>
          )}
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

