import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface Punto {
  t: Date;
  v: number;
}

/** Gráfico de línea (Chart.js) con los valores recibidos de un dispositivo. */
@Component({
  selector: 'app-grafico-linea',
  template: `<div class="contenedor"><canvas #lienzo></canvas></div>`,
  styles: `.contenedor { position: relative; height: 220px; }`,
})
export class GraficoLinea implements AfterViewInit, OnDestroy {
  puntos = input.required<Punto[]>();
  etiqueta = input('Valor');

  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private chart?: Chart;

  constructor() {
    // Cada vez que cambian los puntos o la etiqueta, se redibuja el gráfico.
    effect(() => {
      const puntos = this.puntos();
      const etiqueta = this.etiqueta();
      if (!this.chart) return;
      this.chart.data.labels = puntos.map((p) =>
        p.t.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      );
      this.chart.data.datasets[0].data = puntos.map((p) => p.v);
      this.chart.data.datasets[0].label = etiqueta;
      this.chart.update('none');
    });
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.lienzo().nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: this.etiqueta(),
            data: [],
            borderColor: '#18798a',
            backgroundColor: 'rgba(24, 121, 138, 0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 5, color: '#4b6468' }, grid: { display: false } },
          y: { beginAtZero: false, ticks: { color: '#4b6468' }, grid: { color: '#e6eceb' } },
        },
      },
    });
    // Primer dibujo con los datos que ya existan
    this.chart.data.labels = this.puntos().map((p) =>
      p.t.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    );
    this.chart.data.datasets[0].data = this.puntos().map((p) => p.v);
    this.chart.update('none');
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
