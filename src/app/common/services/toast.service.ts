import { Injectable, signal } from '@angular/core';
import { Toast, ToastAction, ToastKind } from '../models/toast.model';

const DURATION_MS: Readonly<Record<ToastKind, number>> = {
  success: 4000,
  info: 4000,
  error: 8000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastList = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  /** Toasts currently on screen, newest last. */
  readonly toasts = this.toastList.asReadonly();

  /** Shows a confirmation that auto-dismisses after a few seconds. */
  success(message: string): number {
    return this.show('success', message, null);
  }

  /** Shows an error that stays longer and can offer a recovery action such as "Retry". */
  error(message: string, action: ToastAction | null = null): number {
    return this.show('error', message, action);
  }

  /** Removes a toast early, e.g. when the user closes it or runs its action. */
  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toastList.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(kind: ToastKind, message: string, action: ToastAction | null): number {
    const id = this.nextId++;
    this.toastList.update((toasts) => [...toasts, { id, kind, message, action }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), DURATION_MS[kind]),
    );
    return id;
  }
}
