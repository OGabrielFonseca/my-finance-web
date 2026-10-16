import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  isDevMode,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { GoogleIdentityService } from '@core/auth/google-identity.service';
import type { GoogleButtonOptions } from '@core/auth/google-identity.service';
import { ThemeService } from '@core/theme/theme.service';
import { ApiError, skipBusinessErrorToast } from '@shared/data';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';
import { Message } from 'primeng/message';
import { finalize } from 'rxjs';

/** Divisor "ou" + botão oficial "Entrar com o Google" (login e cadastro). Some quando o Google não está disponível. */
@Component({
  selector: 'app-google-sign-in',
  imports: [Button, Divider, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (available()) {
      <p-divider align="center"><span class="text-sm text-muted-color">ou</span></p-divider>

      <div class="flex flex-col gap-3">
        <!-- O GIS desenha um iframe aqui; escondido (não removido) durante o envio para não precisar re-renderizar. -->
        <div #button class="flex min-h-10 justify-center" [class.hidden]="signingIn()"></div>

        @if (signingIn()) {
          <p-button
            label="Entrando com o Google…"
            severity="secondary"
            [outlined]="true"
            [loading]="true"
            [fluid]="true"
          />
        }
        @if (error(); as message) {
          <p-message severity="error">{{ message }}</p-message>
        }
      </div>
    }
  `,
})
export class GoogleSignInComponent {
  readonly text = input<GoogleButtonOptions['text']>('signin_with');
  /** Sessão iniciada: a página decide para onde navegar. */
  readonly signedIn = output();

  private readonly google = inject(GoogleIdentityService);
  private readonly auth = inject(AuthStoreService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly button = viewChild<ElementRef<HTMLElement>>('button');

  protected readonly available = signal(this.google.enabled);
  protected readonly signingIn = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Renderiza depois que o contêiner existe e de novo quando o tema muda.
    effect(() => {
      const element = this.button()?.nativeElement;
      const theme = this.theme.isDark() ? 'filled_black' : 'outline';
      if (!element) return;
      const width = Math.min(element.parentElement?.clientWidth ?? 400, 400);
      this.google
        .renderButton(element, { theme, text: this.text(), width }, (idToken) => this.signIn(idToken))
        .catch((err: unknown) => {
          if (isDevMode()) console.warn('[google] GIS indisponível', err);
          this.available.set(false);
        });
    });
  }

  private signIn(idToken: string): void {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    this.error.set(null);
    this.auth
      .loginWithGoogle(idToken, skipBusinessErrorToast())
      .pipe(
        finalize(() => this.signingIn.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.signedIn.emit(),
        error: (err: unknown) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 422)) this.error.set(err.detail);
        },
      });
  }
}
