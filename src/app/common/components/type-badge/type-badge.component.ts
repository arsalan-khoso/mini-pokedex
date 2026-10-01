import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TYPE_COLORS } from '../../../pokedex/constants/pokedex.constants';

const FALLBACK_COLOR = '#68a090';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  templateUrl: './type-badge.component.html',
  styleUrl: './type-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgeComponent {
  readonly type = input.required<string>();
  protected readonly color = computed(() => TYPE_COLORS[this.type()] ?? FALLBACK_COLOR);
}
