import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, FieldComponent, Button, InputText, Message, Password],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private readonly auth = inject(AuthStoreService);
  private readonly router = inject(Router);

  // Limites do contrato de POST /auth/register (name 120, email 254, senha 8 a 72).
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });
  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.auth.register(value, context),
    () => void this.router.navigateByUrl('/dashboard'),
  );
}
