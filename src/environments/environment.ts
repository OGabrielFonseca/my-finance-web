import type { HttpInterceptorFn } from '@angular/common/http';

export const environment = {
  apiUrl: '/api/v1',
  useMockApi: false,
  /** Interceptors extras; só a configuração "mock" preenche (ver environment.mock.ts). */
  mockInterceptors: [] as HttpInterceptorFn[],
};
