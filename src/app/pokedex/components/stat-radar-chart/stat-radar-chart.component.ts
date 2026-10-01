import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  Filler,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { STAT_COLUMNS } from '../../constants/pokedex.constants';
import { PokemonStats } from '../../models/pokemon.model';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/** Fixed scale so shapes are comparable between Pokémon; values above it still render. */
const SCALE_MAX = 160;

@Component({
  selector: 'app-stat-radar-chart',
  standalone: true,
  templateUrl: './stat-radar-chart.component.html',
  styleUrl: './stat-radar-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatRadarChartComponent {
  readonly stats = input.required<PokemonStats>();
  readonly color = input('#007acc');
  readonly pokemonName = input('');

  protected readonly ariaLabel = computed(() => {
    const stats = this.stats();
    const values = STAT_COLUMNS.map((column) => `${column.label} ${stats[column.key]}`).join(', ');
    return `Base stats for ${this.pokemonName()}: ${values}`;
  });

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'radar', number[], string> | null = null;

  constructor() {
    // The chart is created once and then updated in place, so Chart.js animates the shape
    // from the previous Pokémon's stats to the new one instead of redrawing from scratch.
    afterRenderEffect(() => {
      const values = STAT_COLUMNS.map((column) => this.stats()[column.key]);
      const color = this.color();
      if (!this.chart) {
        this.chart = new Chart(this.canvas().nativeElement, buildConfig(values, color));
        return;
      }
      const [dataset] = this.chart.data.datasets;
      dataset.data = values;
      dataset.borderColor = color;
      dataset.backgroundColor = translucent(color);
      dataset.pointBackgroundColor = color;
      this.chart.update();
    });

    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}

function buildConfig(
  values: number[],
  color: string,
): ChartConfiguration<'radar', number[], string> {
  return {
    type: 'radar',
    data: {
      labels: STAT_COLUMNS.map((column) => column.shortLabel),
      datasets: [
        {
          label: 'Base stat',
          data: values,
          borderColor: color,
          backgroundColor: translucent(color),
          pointBackgroundColor: color,
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0,
          suggestedMax: SCALE_MAX,
          ticks: { display: false, stepSize: 40 },
          grid: { color: 'rgba(255, 255, 255, 0.12)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.12)' },
          pointLabels: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 12, weight: 600 } },
        },
      },
    },
  };
}

/** Appends ~35% alpha to a #rrggbb colour. */
function translucent(hexColor: string): string {
  return `${hexColor}59`;
}
