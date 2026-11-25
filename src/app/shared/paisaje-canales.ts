import { Component } from '@angular/core';

/** Dibujo decorativo para Login y Registro: el río y sus canales vistos desde arriba. */
@Component({
  selector: 'app-paisaje-canales',
  template: `
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <!-- parcelas -->
      @for (p of parcelas; track $index) {
        <rect [attr.x]="p[0]" [attr.y]="p[1]" [attr.width]="p[2]" [attr.height]="p[3]" rx="6" class="parcela" />
      }
      <!-- canales -->
      @for (c of canales; track $index) {
        <path [attr.d]="c" class="canal" />
      }
      <!-- río -->
      <path class="rio-borde" d="M-20 250 C 90 210, 170 300, 290 255 S 470 200, 620 230" />
      <path class="rio" d="M-20 250 C 90 210, 170 300, 290 255 S 470 200, 620 230" />
      <!-- sensores -->
      @for (s of sensores; track $index) {
        <circle [attr.cx]="s[0]" [attr.cy]="s[1]" r="5" class="sensor" />
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: 100%; display: block; }
    .parcela { fill: rgba(143, 209, 127, 0.10); stroke: rgba(143, 209, 127, 0.22); }
    .canal { fill: none; stroke: rgba(127, 196, 207, 0.55); stroke-width: 3; stroke-linecap: round; }
    .rio-borde { fill: none; stroke: rgba(24, 121, 138, 0.45); stroke-width: 26; stroke-linecap: round; }
    .rio { fill: none; stroke: #4fb3c2; stroke-width: 10; stroke-linecap: round; }
    .sensor { fill: #8fd17f; stroke: #0f3d44; stroke-width: 2.5; }
  `,
})
export class PaisajeCanales {
  readonly parcelas = [
    [30, 110, 110, 70], [150, 90, 90, 100], [255, 120, 120, 60], [390, 80, 100, 100], [505, 110, 90, 70],
    [60, 300, 120, 50], [200, 305, 140, 45], [365, 285, 110, 70], [490, 290, 100, 60],
  ];
  readonly canales = [
    'M60 236 L 85 180', 'M190 262 L 195 190', 'M310 250 L 315 180', 'M440 222 L 440 180', 'M550 224 L 550 180',
    'M120 248 L 120 300', 'M260 266 L 270 305', 'M400 230 L 420 285', 'M520 226 L 540 290',
  ];
  readonly sensores = [
    [85, 180], [195, 190], [315, 180], [440, 180], [550, 180], [120, 300], [270, 305], [420, 285], [540, 290],
    [150, 262], [360, 238],
  ];
}
