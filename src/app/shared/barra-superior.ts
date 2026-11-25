import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { LogoViru } from './logo-viru';

/** Barra superior de los Home: marca, sección, usuario y botón para salir. */
@Component({
  selector: 'app-barra-superior',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, LogoViru],
  template: `
    @if (modoDemo) {
      <div class="demo-banner">Modo demo: datos simulados, sin conexión al servidor</div>
    }
    <mat-toolbar class="toolbar">
      <span class="marca"><app-logo-viru [tamano]="26" /> Riego Virú</span>
      <span class="seccion">{{ subtitulo() }}</span>
      <span class="espacio"></span>
      <span class="usuario">{{ auth.usuario()?.nombre }}</span>
      <button mat-icon-button (click)="auth.logout()" matTooltip="Cerrar sesión" aria-label="Cerrar sesión">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>
  `,
  styles: `
    @media (max-width: 600px) {
      .usuario, .seccion { display: none; }
    }
  `,
})
export class BarraSuperior {
  readonly auth = inject(AuthService);
  readonly modoDemo = environment.useMock;
  subtitulo = input.required<string>();
}
