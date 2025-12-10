/**
 * Accessibility utilities for focus management
 * Helps with keyboard navigation and screen readers
 */

/**
 * Trap focus within a container (useful for modals/dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

/**
 * Handle ESC key to close panels/modals
 */
export function handleEscape(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Announce to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus first error in a form
 */
export function focusFirstError(containerOrErrors: HTMLElement | NodeListOf<HTMLElement>) {
  const errors =
    containerOrErrors instanceof HTMLElement
      ? containerOrErrors.querySelectorAll<HTMLElement>('[aria-invalid="true"]')
      : containerOrErrors;

  if (errors.length > 0) {
    errors[0].focus();
    errors[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
