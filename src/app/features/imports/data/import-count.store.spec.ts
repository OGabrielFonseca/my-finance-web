import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ImportApiService } from './import-api.service';
import { ImportCountStore } from './import-count.store';

describe('ImportCountStore', () => {
  const api = { count: vi.fn() };

  beforeEach(() => {
    api.count.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ImportApiService, useValue: api }] });
  });

  it('refresh atualiza o contador com o valor da API', () => {
    api.count.mockReturnValue(of({ pending: 7 }));
    const store = TestBed.inject(ImportCountStore);

    store.refresh();

    expect(store.pending()).toBe(7);
  });

  it('mantém o último valor conhecido quando a API falha', () => {
    const store = TestBed.inject(ImportCountStore);
    api.count.mockReturnValue(of({ pending: 3 }));
    store.refresh();

    api.count.mockReturnValue(throwError(() => new Error('offline')));
    store.refresh();

    expect(store.pending()).toBe(3);
  });
});
