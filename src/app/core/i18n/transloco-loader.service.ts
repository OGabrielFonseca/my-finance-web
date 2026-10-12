import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

/** Carrega public/i18n/<lang>.json; escopos chegam como "<escopo>/<lang>". */
@Injectable({ providedIn: 'root' })
export class TranslocoLoaderService implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}
