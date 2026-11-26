import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { mensajeDeError } from '../../core/auth.interceptor';
import { PanelPredios, Predio } from '../../core/models';

@Component({
  selector: 'app-predios',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Predios y canales</h2>
    <mat-dialog-content>
      @if (panel(); as datos) {
        <div class="predios">
          @for (p of datos.predios; track p.id) {
            <button type="button" mat-stroked-button (click)="editar(p)">
              {{ p.codigo }} · {{ p.nombre }}
            </button>
          } @empty {
            <p>Asigna el primer predio según el padrón de riego.</p>
          }
        </div>
        @if (editando()) {
          <button mat-button type="button" (click)="nuevo()">Nuevo predio</button>
        }
        <form id="form-predio" [formGroup]="form" (ngSubmit)="guardar()">
          <div class="campos">
            <mat-form-field appearance="outline">
              <mat-label>Código de predio</mat-label>
              <input matInput formControlName="codigo" maxlength="32" [readonly]="editando()" />
              <mat-error>Usa letras mayúsculas, números y guiones.</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nombre del predio</mat-label>
              <input matInput formControlName="nombre" maxlength="120" />
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Agricultor</mat-label>
            <mat-select formControlName="agricultorId">
              @for (a of datos.agricultores; track a.id) {
                <mat-option [value]="a.id">{{ a.nombre }} · {{ a.junta }} · {{ a.correo }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Canales que abastecen el predio</mat-label>
            <mat-select formControlName="canalIds" multiple>
              @for (c of datos.canales; track c.id) {
                <mat-option [value]="c.id">{{ c.codigo }} · {{ c.nombre }}</mat-option>
              }
            </mat-select>
            <mat-error>Selecciona al menos un canal.</mat-error>
          </mat-form-field>
        </form>
      } @else if (!error()) {
        <p>Cargando el catálogo de predios…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (confirmacion()) {
        <p role="status">{{ confirmacion() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
      <button mat-flat-button type="submit" form="form-predio" [disabled]="!panel() || guardando()">
        {{ guardando() ? 'Guardando…' : 'Guardar asignación' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .predios { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; max-height: 148px; overflow: auto; }
    .predios p { margin: 0; color: var(--viru-texto-2); }
    form { margin-top: 8px; }
    .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .campos mat-form-field { min-width: 0; }
    .error { color: var(--viru-alerta); }
    @media (max-width: 550px) { .campos { grid-template-columns: 1fr; gap: 0; } }
  `,
})
export class PrediosDialog implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly panel = signal<PanelPredios | null>(null);
  readonly error = signal<string | null>(null);
  readonly confirmacion = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly editando = signal(false);

  readonly form = this.fb.group({
    codigo: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Z0-9][A-Z0-9-]{0,31}$/)]),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    agricultorId: this.fb.control<number | null>(null, Validators.required),
    canalIds: this.fb.nonNullable.control<number[]>([], Validators.required),
  });

  ngOnInit(): void {
    this.cargar();
  }

  nuevo(): void {
    this.form.reset();
    this.editando.set(false);
    this.confirmacion.set(null);
    this.error.set(null);
  }

  editar(predio: Predio): void {
    this.form.reset({
      codigo: predio.codigo,
      nombre: predio.nombre,
      agricultorId: predio.agricultorId,
      canalIds: predio.canales.map((canal) => canal.id),
    });
    this.editando.set(true);
    this.confirmacion.set(null);
    this.error.set(null);
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const { codigo, nombre, agricultorId, canalIds } = this.form.getRawValue();
    if (agricultorId === null) return;

    this.guardando.set(true);
    this.error.set(null);
    this.confirmacion.set(null);
    this.api.guardarPredio(codigo, { nombre: nombre.trim(), agricultorId, canalIds }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(true);
        this.confirmacion.set(`Asignación guardada para ${codigo}.`);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private cargar(): void {
    this.api.panelPredios().subscribe({
      next: (datos) => this.panel.set(datos),
      error: (err) => this.error.set(mensajeDeError(err)),
    });
  }
}
