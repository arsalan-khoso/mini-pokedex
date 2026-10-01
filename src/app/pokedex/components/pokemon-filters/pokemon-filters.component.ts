import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';

@Component({
  selector: 'app-pokemon-filters',
  standalone: true,
  imports: [DisplayNamePipe],
  templateUrl: './pokemon-filters.component.html',
  styleUrl: './pokemon-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonFiltersComponent {
  readonly search = input.required<string>();
  readonly type = input.required<string | null>();
  readonly types = input.required<readonly string[]>();

  readonly searchChange = output<string>();
  readonly typeChange = output<string | null>();

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.typeChange.emit(value || null);
  }
}
