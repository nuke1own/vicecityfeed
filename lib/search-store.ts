"use client";

import { useSyncExternalStore } from "react";

/**
 * Site search open/closed state, shared by the header button, the phone tab
 * bar, keyboard shortcuts and the search dialog.
 */
let open = false;
const listeners = new Set<() => void>();
let lastTrigger: HTMLElement | null = null;
let focusInput: (() => void) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Opens search. Call it straight from a tap or click handler: the input is
 * focused synchronously, which is the only way iOS Safari shows the keyboard.
 */
export function openSearch(): void {
  if (open) return;
  const active = document.activeElement;
  lastTrigger = active instanceof HTMLElement && active !== document.body ? active : null;
  focusInput?.();
  open = true;
  emit();
}

export function closeSearch({ restoreFocus = true } = {}): void {
  if (!open) return;
  open = false;
  emit();
  const trigger = lastTrigger;
  lastTrigger = null;
  if (restoreFocus && trigger?.isConnected && trigger.getClientRects().length > 0) {
    trigger.focus({ preventScroll: true });
  } else if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

/** The dialog registers how to make its input focusable and focus it. */
export function registerSearchInput(focus: (() => void) | null): void {
  focusInput = focus;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
