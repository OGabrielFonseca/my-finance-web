import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { IntegrationApiService } from './integration-api.service';

describe('IntegrationApiService (cartões)', () => {
  let api: IntegrationApiService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/integrations/pluggy/credit-card-links`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(IntegrationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as contas de cartão com paginação máxima e devolve os itens', () => {
    let result: unknown[] = [];
    api.creditCardLinks().subscribe((links) => (result = links));

    const req = http.expectOne((r) => r.url === base && r.method === 'GET');
    expect(req.request.params.get('size')).toBeTruthy();
    req.flush({ items: [{ id: 'l1' }], page: 0, size: 1, totalItems: 1, totalPages: 1 });

    expect(result).toEqual([{ id: 'l1' }]);
  });

  it('vincula com creditCardId e importFrom', () => {
    api.linkCreditCard('l1', { creditCardId: 'c1', importFrom: '2026-10-01' }).subscribe();

    const req = http.expectOne(`${base}/l1/link`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ creditCardId: 'c1', importFrom: '2026-10-01' });
    req.flush({});
  });

  it('cria cartão a partir da conta sem dias quando a Pluggy já os informa', () => {
    api.createLinkedCreditCard('l1', { paymentAccountId: 'a1', importFrom: '2026-10-01' }).subscribe();

    const req = http.expectOne(`${base}/l1/create-card`);
    expect(req.request.body).toEqual({ paymentAccountId: 'a1', importFrom: '2026-10-01' });
    req.flush({});
  });

  it('ignora e desvincula com POST', () => {
    api.ignoreCreditCard('l1').subscribe();
    http.expectOne(`${base}/l1/ignore`).flush({});

    api.unlinkCreditCard('l1').subscribe();
    http.expectOne(`${base}/l1/unlink`).flush({});
  });
});
