import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast } from '../../models/toast.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  protected runAction(toast: Toast): void {
    this.toastService.dismiss(toast.id);
    toast.action?.run();
  }

  protected dismiss(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }
}
