import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmering placeholder block used while content loads, sized to match the real content. */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sizing lives on the host so parents can align it like any block (e.g. right-aligned cells).
  host: {
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('var(--radius-sm)');
}
