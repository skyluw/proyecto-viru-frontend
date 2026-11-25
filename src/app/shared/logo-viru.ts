import { Component, input } from '@angular/core';

/** Marca: un cauce del que salen dos canales (el sistema de riego visto desde arriba). */
@Component({
  selector: 'app-logo-viru',
  template: `
    <svg [attr.width]="tamano()" [attr.height]="tamano()" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" [attr.fill]="fondo()" />
      <path d="M4 19 C 10 15, 15 23, 21 18 S 26 15, 28 15" fill="none" [attr.stroke]="trazo()" stroke-width="3.2" stroke-linecap="round" />
      <path d="M11 18.4 L 13 9" fill="none" [attr.stroke]="trazo()" stroke-width="2" stroke-linecap="round" opacity="0.75" />
      <path d="M21 18 L 23 26" fill="none" [attr.stroke]="trazo()" stroke-width="2" stroke-linecap="round" opacity="0.75" />
      <circle cx="13" cy="9" r="2.6" fill="#8fd17f" />
      <circle cx="23" cy="26" r="2.6" fill="#8fd17f" />
    </svg>
  `,
  styles: `:host { display: inline-flex; } svg { display: block; }`,
})
export class LogoViru {
  tamano = input(32);
  fondo = input('#18798a');
  trazo = input('#ffffff');
}
