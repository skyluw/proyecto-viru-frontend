import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LogoViru } from '../../shared/logo-viru';
import { PaisajeCanales } from '../../shared/paisaje-canales';
import { mensajeDeError } from '../../core/auth.interceptor';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Junta, PASSWORD_PATTERN } from '../../core/catalogos';
import { UserResponse } from '../../core/models';

type TipoCuenta = 'FARMER' | 'ADMIN';

/** Valida que "confirmar" sea igual a "password". */
function passwordsIguales(grupo: AbstractControl): ValidationErrors | null {
  const p = grupo.get('password')?.value;
  const c = grupo.get('confirmar')?.value;
  return p && c && p !== c ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LogoViru,
    PaisajeCanales,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './registro.page.html',
  styleUrl: '../auth.scss',
})
export class RegistroPage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiService);

  readonly juntas = signal<Junta[]>([]);
  tipo = signal<TipoCuenta>('FARMER');
  cargando = signal(false);
  error = signal<string | null>(null);
  exito = signal(false);

  // Un solo formulario; los campos que no aplican al tipo elegido se deshabilitan.
  form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(40)]],
      correo: ['', [Validators.required, Validators.email]],
      juntaReganteId: [null as number | null, Validators.required],
      codigoSecreto: [{ value: '', disabled: true }, Validators.required],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmar: ['', Validators.required],
    },
    { validators: passwordsIguales },
  );

  ngOnInit(): void {
    this.api.catalogoRiego().subscribe({
      next: ({ juntas }) => this.juntas.set(juntas),
      error: (err) => this.error.set(mensajeDeError(err)),
    });
  }

  cambiarTipo(tipo: TipoCuenta): void {
    this.tipo.set(tipo);
    this.error.set(null);
    const c = this.form.controls;
    if (tipo === 'ADMIN') {
      c.apellido.disable();
      c.juntaReganteId.disable();
      c.codigoSecreto.enable();
    } else {
      c.apellido.enable();
      c.juntaReganteId.enable();
      c.codigoSecreto.disable();
    }
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datosBase = {
      nombre: v.nombre!.trim(),
      correo: v.correo!.trim().toLowerCase(),
      password: v.password!,
    };

    const peticion: Observable<UserResponse> =
      this.tipo() === 'ADMIN'
        ? this.auth.registrarAdmin({ ...datosBase, codigoSecreto: v.codigoSecreto!.trim() })
        : this.auth.registrarAgricultor({
            ...datosBase,
            apellido: v.apellido!.trim(),
            juntaReganteId: v.juntaReganteId!,
          });

    this.cargando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: () => {
        this.exito.set(true);
        this.cargando.set(false);
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
