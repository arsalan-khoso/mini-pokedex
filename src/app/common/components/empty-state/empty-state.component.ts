import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.empty-state--compact]': 'compact()' },
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  /** Optional call to action, e.g. "Clear filters"; hidden when null. */
  readonly actionLabel = input<string | null>(null);
  readonly compact = input(false);
  readonly action = output<void>();
}
