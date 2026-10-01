import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmering placeholder block used while content loads, sized to match the real content. */
@Component({
  selector: 'app-skeleton',
  template: '',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('var(--radius-sm)');
}
