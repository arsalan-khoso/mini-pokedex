import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  of,
  shareReplay,
  tap,
} from 'rxjs';
import { AsyncResource, LoadStatus } from '../../common/models/load-status.model';
import { ToastService } from '../../common/services/toast.service';
import { toUserMessage } from '../../common/utils/error-message.util';
import { Team, TeamDraft } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';

export type TeamState = AsyncResource<readonly Team[]>;

interface CreateRequest {
  draft: TeamDraft;
  tempId: string;
}

interface DeleteRequest {
  team: Team;
  index: number;
}

const INITIAL_STATE: TeamState = { status: 'idle', data: [], error: null };

const OPTIMISTIC_ID_PREFIX = 'optimistic-';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSubject = new BehaviorSubject<TeamState>(INITIAL_STATE);
  readonly state$: Observable<TeamState> = this.stateSubject.asObservable();

  readonly teams$: Observable<readonly Team[]> = this.state$.pipe(
    map((state) => state.data),
    distinctUntilChanged(),
    shareReplay(1),
  );
  readonly status$: Observable<LoadStatus> = this.state$.pipe(
    map((state) => state.status),
    distinctUntilChanged(),
  );
  readonly error$: Observable<string | null> = this.state$.pipe(
    map((state) => state.error),
    distinctUntilChanged(),
  );

  private readonly loadRequests = new Subject<void>();
  private readonly createRequests = new Subject<CreateRequest>();
  private readonly deleteRequests = new Subject<DeleteRequest>();
  private optimisticSequence = 0;

  constructor() {
    this.loadRequests
      .pipe(
        exhaustMap(() => this.fetchTeams$()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // mergeMap: independent mutations run concurrently; each one settles its own optimistic entry.
    this.createRequests
      .pipe(
        mergeMap((request) => this.persistCreate$(request)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.deleteRequests
      .pipe(
        mergeMap((request) => this.persistDelete$(request)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Current state snapshot. */
  get state(): TeamState {
    return this.stateSubject.value;
  }

  /** Loads teams once; later calls reuse the cached list. */
  loadTeams(): void {
    const { status } = this.state;
    if (status === 'loading' || status === 'success') return;
    this.loadRequests.next();
  }

  /** Re-requests teams after a failure. */
  retryLoadTeams(): void {
    this.loadRequests.next();
  }

  /**
   * Optimistically adds the team to the top of the list (flagged `isPending`), then persists it.
   * On success the placeholder is swapped for the saved record; on failure it is removed again
   * and an error toast offers to retry.
   */
  createTeam(draft: TeamDraft): void {
    const tempId = `${OPTIMISTIC_ID_PREFIX}${++this.optimisticSequence}`;
    const optimisticTeam: Team = {
      id: tempId,
      name: draft.name.trim(),
      trainerName: null,
      pokemonIds: [...draft.pokemonIds],
      createdAt: new Date().toISOString(),
      isPending: true,
    };
    this.setTeams([optimisticTeam, ...this.state.data]);
    this.createRequests.next({ draft: { ...draft, name: optimisticTeam.name }, tempId });
  }

  /**
   * Optimistically removes the team, then deletes it on the server. On failure the team is
   * restored at its original position and an error toast offers to retry.
   */
  deleteTeam(id: string): void {
    const index = this.state.data.findIndex((team) => team.id === id);
    const team = this.state.data[index];
    if (!team || team.isPending) return;
    this.setTeams(this.state.data.filter((existing) => existing.id !== id));
    this.deleteRequests.next({ team, index });
  }

  /**
   * Whether a team with this name (case-insensitive) already exists, checking teams in the
   * list (including unsaved optimistic ones) first and then the server.
   */
  isNameTaken$(name: string): Observable<boolean> {
    const normalized = normalizeName(name);
    if (this.state.data.some((team) => normalizeName(team.name) === normalized)) {
      return of(true);
    }
    return this.api
      .findTeamNames$(name.trim())
      .pipe(map((names) => names.some((existing) => normalizeName(existing) === normalized)));
  }

  private fetchTeams$(): Observable<unknown> {
    this.stateSubject.next({ ...this.state, status: 'loading', error: null });
    return this.api.getTeams$().pipe(
      tap((serverTeams) => {
        // Keep creates that are still in flight so a reload does not hide them.
        const pending = this.state.data.filter((team) => team.isPending);
        this.stateSubject.next({
          status: 'success',
          data: [...pending, ...serverTeams],
          error: null,
        });
      }),
      catchError((error: unknown) => {
        this.stateSubject.next({
          ...this.state,
          status: 'error',
          error: toUserMessage(error, 'load teams'),
        });
        return EMPTY;
      }),
    );
  }

  private persistCreate$({ draft, tempId }: CreateRequest): Observable<unknown> {
    return this.api.createTeam$(draft).pipe(
      tap((saved) => {
        const hasPlaceholder = this.state.data.some((team) => team.id === tempId);
        this.setTeams(
          hasPlaceholder
            ? this.state.data.map((team) => (team.id === tempId ? saved : team))
            : [saved, ...this.state.data],
        );
        this.toast.success(`Team "${saved.name}" saved.`);
      }),
      catchError((error: unknown) => {
        this.setTeams(this.state.data.filter((team) => team.id !== tempId));
        this.toast.error(toUserMessage(error, `save team "${draft.name}"`), {
          label: 'Retry',
          run: () => this.createTeam(draft),
        });
        return EMPTY;
      }),
    );
  }

  private persistDelete$({ team, index }: DeleteRequest): Observable<unknown> {
    return this.api.deleteTeam$(team.id).pipe(
      tap(() => this.toast.success(`Team "${team.name}" deleted.`)),
      catchError((error: unknown) => {
        const teams = [...this.state.data];
        teams.splice(Math.min(index, teams.length), 0, team);
        this.setTeams(teams);
        this.toast.error(toUserMessage(error, `delete team "${team.name}"`), {
          label: 'Retry',
          run: () => this.deleteTeam(team.id),
        });
        return EMPTY;
      }),
    );
  }

  private setTeams(teams: readonly Team[]): void {
    this.stateSubject.next({ ...this.state, data: teams });
  }
}
