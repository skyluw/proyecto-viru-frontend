import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { mensajeDeError } from '../../core/auth.interceptor';
import { CatalogoRiego, TIPO_MENSAJE_LABEL } from '../../core/catalogos';
import { AlcanceMensaje, EnviarMensajeRequest, MensajeEnviado, TipoMensaje } from '../../core/models';

export interface EnviarMensajeData {
  notaSugerida?: string;
  tipoSugerido?: TipoMensaje;
}

/**
 * Formulario para POST /api/admin/mensajes. Aplica las mismas reglas que MensajeService:
 *  - HORA_RIEGO necesita riegoEn; las alertas no llevan riegoEn.
 *  - Alcance JUNTA necesita juntaReganteId; REGION necesita regionId.
 */
@Component({
  selector: 'app-enviar-mensaje',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Enviar aviso a agricultores</h2>
    <form [formGroup]="form" (ngSubmit)="enviar()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Tipo de aviso</mat-label>
          <mat-select formControlName="tipo">
            @for (t of tipos; track t) {
              <mat-option [value]="t">{{ etiquetas[t] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <p class="etiqueta">Destinatarios</p>
        <mat-button-toggle-group formControlName="alcance" class="full alcance">
          <mat-button-toggle value="JUNTA">Una junta</mat-button-toggle>
          <mat-button-toggle value="REGION">Toda una región</mat-button-toggle>
        </mat-button-toggle-group>

        @if (form.controls.alcance.value === 'JUNTA') {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Junta de regantes</mat-label>
            <mat-select formControlName="juntaReganteId">
              @for (j of catalogo()?.juntas ?? []; track j.id) {
                <mat-option [value]="j.id">{{ j.nombre }}</mat-option>
              }
            </mat-select>
            <mat-error>Elige una junta</mat-error>
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Región</mat-label>
            <mat-select formControlName="regionId">
              @for (r of catalogo()?.regiones ?? []; track r.id) {
                <mat-option [value]="r.id">{{ r.nombre }}</mat-option>
              }
            </mat-select>
            <mat-error>Elige una región</mat-error>
          </mat-form-field>
        }

        @if (form.controls.tipo.value === 'HORA_RIEGO') {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Fecha y hora de riego</mat-label>
            <input matInput type="datetime-local" formControlName="riegoEn" />
            <mat-error>Indica cuándo empieza el riego</mat-error>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full">
          <mat-label>Nota (opcional)</mat-label>
          <textarea matInput rows="3" formControlName="nota" maxlength="500"></textarea>
          <mat-hint align="end">{{ form.controls.nota.value?.length ?? 0 }}/500</mat-hint>
        </mat-form-field>

        @if (error()) {
          <p class="error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="enviando() || !catalogo()">
          <mat-icon>send</mat-icon> Enviar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content { min-width: min(440px, 80vw); }
    .etiqueta { margin: 0 0 6px; font-size: 13px; color: var(--viru-muted); }
    .alcance { margin-bottom: 18px; }
    .alcance mat-button-toggle { flex: 1; }
    .error { display: flex; align-items: center; gap: 8px; color: var(--viru-warn);
      background: var(--viru-warn-bg); padding: 8px 12px; border-radius: 8px; font-size: 14px; }
  `,
})
export class EnviarMensajeDialog implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<EnviarMensajeDialog, MensajeEnviado>);
  private data = inject<EnviarMensajeData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly catalogo = signal<CatalogoRiego | null>(null);
  readonly etiquetas = TIPO_MENSAJE_LABEL;
  readonly tipos: TipoMensaje[] = [
    'HORA_RIEGO', 'ALERTA_BAJO_CAUDAL', 'ALERTA_ALTO_CAUDAL', 'ALERTA_METEOROLOGICA',
  ];

  enviando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    tipo: [this.data?.tipoSugerido ?? ('HORA_RIEGO' as TipoMensaje), Validators.required],
    alcance: ['JUNTA' as AlcanceMensaje, Validators.required],
    juntaReganteId: [null as number | null],
    regionId: [null as number | null],
    riegoEn: [''],
    nota: [this.data?.notaSugerida ?? ''],
  });

  ngOnInit(): void {
    this.api.catalogoRiego().subscribe({
      next: (catalogo) => this.catalogo.set(catalogo),
      error: (err) => this.error.set(mensajeDeError(err)),
    });
  }

  enviar(): void {
    const v = this.form.getRawValue();
    const c = this.form.controls;

    // Validaciones que dependen de varios campos (igual que en el backend)
    const destino = v.alcance === 'JUNTA' ? c.juntaReganteId : c.regionId;
    const otro = v.alcance === 'JUNTA' ? c.regionId : c.juntaReganteId;
    otro.setErrors(null);
    destino.setErrors(destino.value ? null : { required: true });
    c.riegoEn.setErrors(v.tipo === 'HORA_RIEGO' && !v.riegoEn ? { required: true } : null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos: EnviarMensajeRequest = {
      tipo: v.tipo!,
      alcance: v.alcance!,
      juntaReganteId: v.alcance === 'JUNTA' ? v.juntaReganteId : null,
      regionId: v.alcance === 'REGION' ? v.regionId : null,
      // datetime-local está en hora de Lima; toISOString lo pasa a UTC (Instant)
      riegoEn: v.tipo === 'HORA_RIEGO' ? new Date(v.riegoEn!).toISOString() : null,
      nota: v.nota?.trim() || null,
    };

    this.enviando.set(true);
    this.error.set(null);
    this.api.enviarMensaje(datos).subscribe({
      next: (resp) => this.ref.close(resp),
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
