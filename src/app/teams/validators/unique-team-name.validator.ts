import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { TEAM_NAME_CHECK_DEBOUNCE_MS } from '../constants/team.constants';

/**
 * Async validator that rejects names already in use.
 *
 * Angular unsubscribes the previous validation run whenever the value changes, so waiting on
 * `timer()` first acts as a debounce: only a pause in typing reaches `isNameTaken`.
 * If the check itself fails the control gets `teamNameUnverified` rather than passing silently.
 */
export function uniqueTeamNameValidator(
  isNameTaken: (name: string) => Observable<boolean>,
  debounceMs = TEAM_NAME_CHECK_DEBOUNCE_MS,
): AsyncValidatorFn {
  return (control: AbstractControl<string | null>): Observable<ValidationErrors | null> => {
    const name = (control.value ?? '').trim();
    if (!name) return of(null);

    return timer(debounceMs).pipe(
      switchMap(() => isNameTaken(name)),
      map((taken) => (taken ? { teamNameTaken: true } : null)),
      catchError(() => of({ teamNameUnverified: true })),
    );
  };
}
