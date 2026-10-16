import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { FieldComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

import { GoogleSignInComponent } from './google-sign-in.component';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FieldComponent,
    Button,
    InputText,
    Message,
    Password,
    GoogleSignInComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthStoreService);
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
    () => this.goToApp(),
  );

  protected goToApp(): void {
    void this.router.navigateByUrl(this.returnUrl() || '/dashboard');
  }
}
