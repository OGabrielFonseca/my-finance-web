import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { skipBusinessErrorToast, SKIP_BUSINESS_ERROR_TOAST } from '../data/http-context';
import { CrudApi } from './crud-api';

interface Thing {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
class ThingApi extends CrudApi<Thing, { name: string }, { name: string }, { name: string; archived: boolean }> {
  protected readonly path = '/things';
}

describe('CrudApi', () => {
  let api: ThingApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ThingApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('list envia filtro e paginação como query params', () => {
    api
      .list({ name: 'nu', archived: false }, { page: 1, size: 20, sort: { field: 'name', direction: 'asc' } })
      .subscribe();
    const req = backend.expectOne((r) => r.url === '/api/v1/things');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.toString()).toBe('name=nu&archived=false&page=1&size=20&sort=name,asc');
  });

  it('create e update repassam o HttpContext', () => {
    api.create({ name: 'a' }, skipBusinessErrorToast()).subscribe();
    const create = backend.expectOne('/api/v1/things');
    expect(create.request.method).toBe('POST');
    expect(create.request.context.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(true);

    api.update('t1', { name: 'b' }).subscribe();
    const update = backend.expectOne('/api/v1/things/t1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.context.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(false);
  });

  it('archive faz PATCH /{id}/archive sem corpo', () => {
    api.archive('t1').subscribe();
    const req = backend.expectOne('/api/v1/things/t1/archive');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
  });

  it('get e delete usam /{id}', () => {
    api.get('t1').subscribe();
    expect(backend.expectOne('/api/v1/things/t1').request.method).toBe('GET');
    api.delete('t1').subscribe();
    expect(backend.expectOne('/api/v1/things/t1').request.method).toBe('DELETE');
  });
});
