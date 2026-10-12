import { signal } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PageResponse } from '../data/page';

/**
 * Cache de opções de um seletor (endpoints /options). Carrega na primeira vez que alguém pede e recarrega quando a tela
 * do recurso salva ou arquiva (invalidate). As features expõem uma subclasse @Injectable({ providedIn: 'root' }).
 */
export class Lookup<T> {
  private readonly state = signal<readonly T[]>([]);
  private readonly loadedState = signal(false);
  private requested = false;

  readonly items = this.state.asReadonly();
  readonly loaded = this.loadedState.asReadonly();

  constructor(private readonly loader: () => Observable<PageResponse<T>>) {}

  ensureLoaded(): void {
    if (this.requested) return;
    this.requested = true;
    this.loader().subscribe({
      next: (page) => {
        this.state.set(page.items);
        this.loadedState.set(true);
      },
      error: () => (this.requested = false),
    });
  }

  /** Recarrega só se já tinha sido carregado; senão, carrega quando alguém pedir. */
  invalidate(): void {
    if (!this.requested) return;
    this.requested = false;
    this.ensureLoaded();
  }
}
