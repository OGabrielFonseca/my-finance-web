import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonLabel } from 'primeng/button';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslocoPipe, ButtonDirective, ButtonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col items-center gap-3 py-16 text-center">
      <i class="pi pi-compass text-5xl text-muted-color"></i>
      <h1 class="m-0 text-2xl font-semibold">{{ 'errors.notFound.title' | transloco }}</h1>
      <p class="m-0 text-muted-color">{{ 'errors.notFound.message' | transloco }}</p>
      <a pButton routerLink="/dashboard">
        <span pButtonLabel>{{ 'errors.notFound.back' | transloco }}</span>
      </a>
    </section>
  `,
})
export class NotFoundPage {}
