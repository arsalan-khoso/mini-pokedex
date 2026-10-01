import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: '',
  styleUrl: './spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class SpinnerComponent {
  readonly size = input(16);
  readonly label = input('Loading');
}
