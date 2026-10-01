import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.error-state--compact]': 'compact()' },
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input.required<string>();
  readonly compact = input(false);
  readonly retry = output<void>();
}
