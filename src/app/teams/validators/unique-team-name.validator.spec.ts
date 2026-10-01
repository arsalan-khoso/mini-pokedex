import { FormControl } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';
import { uniqueTeamNameValidator } from './unique-team-name.validator';

const EXISTING = ['kanto starters', 'johto squad'];
const DEBOUNCE_MS = 300;

describe('uniqueTeamNameValidator', () => {
  let isNameTaken: Mock<(name: string) => Observable<boolean>>;

  function createControl(): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      asyncValidators: uniqueTeamNameValidator(isNameTaken, DEBOUNCE_MS),
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    isNameTaken = vi.fn((name: string) => of(EXISTING.includes(name.toLowerCase())));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags a name that is already taken once the debounce elapses', () => {
    const control = createControl();

    control.setValue('Kanto Starters');
    expect(control.pending).toBe(true);

    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(control.errors).toEqual({ teamNameTaken: true });
  });

  it('accepts an available name and checks the trimmed value', () => {
    const control = createControl();

    control.setValue('  Rain Dance  ');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(control.valid).toBe(true);
    expect(isNameTaken).toHaveBeenCalledWith('Rain Dance');
  });

  it('debounces typing so only the final value is checked', () => {
    const control = createControl();

    control.setValue('Ra');
    vi.advanceTimersByTime(100);
    control.setValue('Rai');
    vi.advanceTimersByTime(100);
    control.setValue('Rain');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(isNameTaken).toHaveBeenCalledTimes(1);
    expect(isNameTaken).toHaveBeenCalledWith('Rain');
  });

  it('reports an unverified name instead of passing when the check fails', () => {
    isNameTaken.mockReturnValue(throwError(() => new Error('offline')));
    const control = createControl();

    control.setValue('Rain Dance');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(control.errors).toEqual({ teamNameUnverified: true });
  });
});
