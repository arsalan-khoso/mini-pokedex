import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    title: 'Teams · Mini Pokédex',
    loadComponent: () => import('./teams-page/teams-page.component').then((m) => m.TeamsPage),
  },
];
