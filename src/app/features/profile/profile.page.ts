import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { ProfileApiService } from './data/profile-api.service';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, ReactiveFormsModule, TranslocoPipe, FieldComponent, Button, InputText, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  private readonly api = inject(ProfileApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly auth = inject(AuthStoreService);

  // Limites do contrato de PUT /me (name 120, email 254).
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });
  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.api.update(value, context),
    (user) => {
      this.auth.setUser(user);
      this.notifier.success('common.success.saved');
    },
  );

  constructor() {
    const user = this.auth.user();
    if (user) this.form.patchValue({ name: user.name, email: user.email });
  }
}
