import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from '../../common/services/toast.service';
import { Team } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';
import { TeamStore } from './team.store';

function makeTeam(id: string, name: string): Team {
  return {
    id,
    name,
    trainerName: 'Ash Ketchum',
    pokemonIds: [25],
    createdAt: '2024-01-15T10:00:00Z',
    isPending: false,
  };
}

const KANTO = makeTeam('1', 'Kanto Starters');
const JOHTO = makeTeam('2', 'Johto Squad');

describe('TeamStore', () => {
  let store: TeamStore;
  let createResponse: Subject<Team>;
  let deleteResponse: Subject<void>;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    createResponse = new Subject<Team>();
    deleteResponse = new Subject<void>();
    toast = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TeamApiService,
          useValue: {
            getTeams$: () => of([KANTO, JOHTO]),
            createTeam$: () => createResponse,
            deleteTeam$: () => deleteResponse,
            findTeamNames$: () => of([]),
          },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
    store = TestBed.inject(TeamStore);
    store.loadTeams();
  });

  describe('createTeam (optimistic)', () => {
    it('shows the new team immediately, then swaps in the saved record', () => {
      store.createTeam({ name: '  Rain Dance ', pokemonIds: [7, 9] });

      const [optimistic] = store.state.data;
      expect(store.state.data).toHaveLength(3);
      expect(optimistic).toMatchObject({ name: 'Rain Dance', pokemonIds: [7, 9], isPending: true });

      createResponse.next(makeTeam('4', 'Rain Dance'));

      expect(store.state.data.map((team) => team.id)).toEqual(['4', '1', '2']);
      expect(store.state.data[0].isPending).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Team "Rain Dance" saved.');
    });

    it('rolls back and shows an error toast with a retry action when the mutation fails', () => {
      store.createTeam({ name: 'Rain Dance', pokemonIds: [7] });
      expect(store.state.data).toHaveLength(3);

      createResponse.error(new HttpErrorResponse({ status: 0 }));

      expect(store.state.data).toEqual([KANTO, JOHTO]);
      expect(toast.error).toHaveBeenCalledTimes(1);
      const [message, action] = toast.error.mock.calls[0];
      expect(message).toContain('save team "Rain Dance"');
      expect(action).toMatchObject({ label: 'Retry' });
    });
  });

  describe('deleteTeam (optimistic)', () => {
    it('restores the team at its original position when the delete fails', () => {
      store.deleteTeam(JOHTO.id);
      expect(store.state.data).toEqual([KANTO]);

      deleteResponse.error(new HttpErrorResponse({ status: 500 }));

      expect(store.state.data).toEqual([KANTO, JOHTO]);
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('isNameTaken$', () => {
    it('matches existing team names case-insensitively, ignoring surrounding spaces', () => {
      let taken: boolean | undefined;
      store.isNameTaken$('  kanto STARTERS ').subscribe((result) => (taken = result));
      expect(taken).toBe(true);
    });
  });
});
