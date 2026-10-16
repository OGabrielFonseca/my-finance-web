import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective, ButtonLabel } from 'primeng/button';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ButtonDirective, ButtonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col items-center gap-3 py-16 text-center">
      <i class="pi pi-compass text-5xl text-muted-color"></i>
      <h1 class="m-0 text-2xl font-semibold">{{ 'Página não encontrada' }}</h1>
      <p class="m-0 text-muted-color">{{ 'O endereço acessado não existe.' }}</p>
      <a pButton routerLink="/dashboard">
        <span pButtonLabel>{{ 'Ir para o dashboard' }}</span>
      </a>
    </section>
  `,
})
export class NotFoundPage {}
