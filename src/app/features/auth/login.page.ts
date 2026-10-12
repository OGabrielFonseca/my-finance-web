import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '@core/auth/auth.store';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent } from '@shared/forms/field.component';
import { injectFormSubmit } from '@shared/forms/form-submit';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TranslocoPipe, FieldComponent, Button, InputText, Message, Password],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Preenchido pelo query param ?returnUrl= (withComponentInputBinding). */
  readonly returnUrl = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.auth.login(value, context),
    () => void this.router.navigateByUrl(this.returnUrl() || '/dashboard'),
  );
}
