import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { filter, take } from 'rxjs';
import { SpinnerComponent } from '../../../common/components/spinner/spinner.component';
import {
  TEAM_MAX_POKEMON,
  TEAM_MIN_POKEMON,
  TEAM_NAME_MAX_LENGTH,
  TEAM_NAME_MIN_LENGTH,
} from '../../constants/team.constants';
import { TeamStore } from '../../state/team.store';
import { uniqueTeamNameValidator } from '../../validators/unique-team-name.validator';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';

@Component({
  selector: 'app-team-builder-form',
  imports: [PokemonPickerComponent, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './team-builder-form.component.html',
  styleUrl: './team-builder-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderFormComponent {
  private readonly teamStore = inject(TeamStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nameMaxLength = TEAM_NAME_MAX_LENGTH;
  protected readonly maxPokemon = TEAM_MAX_POKEMON;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      {
        validators: [
          Validators.required,
          Validators.minLength(TEAM_NAME_MIN_LENGTH),
          Validators.maxLength(TEAM_NAME_MAX_LENGTH),
        ],
        asyncValidators: [uniqueTeamNameValidator((name) => this.teamStore.isNameTaken$(name))],
      },
    ],
    pokemonIds: [
      [] as number[],
      // `minLength` skips empty values by design, so `required` is what rejects an empty team.
      [
        Validators.required,
        Validators.minLength(TEAM_MIN_POKEMON),
        Validators.maxLength(TEAM_MAX_POKEMON),
      ],
    ],
  });

  /**
   * Reactive Forms state lives outside signals, so OnPush views would miss async validator
   * results. `form.events` (value, status, touched, pristine) re-triggers the computeds below.
   */
  private readonly formEvent = toSignal(this.form.events);

  protected readonly nameLength = computed(() => {
    this.formEvent();
    return this.form.controls.name.value.length;
  });
  protected readonly selectedCount = computed(() => {
    this.formEvent();
    return this.form.controls.pokemonIds.value.length;
  });
  protected readonly isCheckingName = computed(() => {
    this.formEvent();
    return this.form.controls.name.pending;
  });
  protected readonly isFormPending = computed(() => {
    this.formEvent();
    return this.form.pending;
  });
  protected readonly nameError = computed(() => {
    this.formEvent();
    const control = this.form.controls.name;
    if (!shouldShowErrors(control)) return null;
    if (control.hasError('required')) return 'Give your team a name.';
    if (control.hasError('minlength')) {
      return `Use at least ${TEAM_NAME_MIN_LENGTH} characters.`;
    }
    if (control.hasError('maxlength')) {
      return `Keep it to ${TEAM_NAME_MAX_LENGTH} characters or fewer.`;
    }
    if (control.hasError('teamNameTaken')) return 'A team with this name already exists.';
    if (control.hasError('teamNameUnverified')) {
      return "We couldn't check if this name is free. Check the team server and try again.";
    }
    return null;
  });
  protected readonly pokemonError = computed(() => {
    this.formEvent();
    const control = this.form.controls.pokemonIds;
    if (!shouldShowErrors(control)) return null;
    if (control.hasError('required') || control.hasError('minlength')) {
      return `Pick at least ${TEAM_MIN_POKEMON} Pokémon.`;
    }
    if (control.hasError('maxlength'))
      return `A team can have at most ${TEAM_MAX_POKEMON} Pokémon.`;
    return null;
  });

  private isAwaitingValidation = false;

  protected onSubmit(): void {
    this.form.markAllAsTouched();

    // Submitting right after typing can land mid-way through the async name check:
    // wait for it to settle instead of silently ignoring the click.
    if (this.form.pending) {
      if (this.isAwaitingValidation) return;
      this.isAwaitingValidation = true;
      this.form.statusChanges
        .pipe(
          filter((status) => status !== 'PENDING'),
          take(1),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          this.isAwaitingValidation = false;
          this.submitIfValid();
        });
      return;
    }
    this.submitIfValid();
  }

  private submitIfValid(): void {
    if (this.form.invalid) return;
    const { name, pokemonIds } = this.form.getRawValue();
    this.teamStore.createTeam({ name: name.trim(), pokemonIds });
    this.form.reset();
  }
}

function shouldShowErrors(control: AbstractControl): boolean {
  return control.invalid && (control.dirty || control.touched);
}
