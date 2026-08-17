import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';

interface ConversationMenuProps {
  title: string;
  onDelete: () => void;
  isDeleting: boolean;
}

interface Anchor {
  top: number;
  right: number;
}

/**
 * Per-conversation actions.
 *
 * The popup is fixed-positioned rather than absolute because the rail scrolls
 * and would otherwise clip the menu of any chat near its bottom edge. That
 * means it has to close on scroll or resize, or it would float free of the
 * button it belongs to.
 */
export function ConversationMenu({ title, onDelete, isDeleting }: ConversationMenuProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = anchor !== null;

  const close = () => {
    setAnchor(null);
    setIsConfirming(false);
  };

  const toggle = () => {
    if (isOpen) return close();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Capture: the rail scrolls, and that scroll doesn't bubble to window.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isDeleting}
        onClick={toggle}
        className={cn(
          'rounded-md p-1 text-content-secondary transition-colors hover:bg-white/10 hover:text-content focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-50',
          // No hover on touch, so the affordance is always visible there.
          'md:opacity-0 md:group-hover:opacity-100',
          isOpen && 'bg-white/10 text-content md:opacity-100',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {anchor && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Options for ${title}`}
          style={{ top: anchor.top, right: anchor.right }}
          className="fixed z-50 w-52 overflow-hidden rounded-lg border border-line bg-surface-raised p-1 shadow-lg"
        >
          {isConfirming ? (
            <>
              <p className="px-2 py-1.5 text-xs text-content-secondary">
                Delete this chat? It leaves your history.
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Yes, delete it
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={close}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setIsConfirming(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete chat
            </button>
          )}
        </div>
      )}
    </>
  );
}
