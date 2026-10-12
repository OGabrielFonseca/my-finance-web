import type { HttpInterceptorFn } from '@angular/common/http';

import { mockApiInterceptor } from '../app/mock/mock-api.interceptor';

/** Usado só em `npm run start:mock` (fileReplacements). É o único arquivo que importa o código do mock. */
export const environment = {
  apiUrl: '/api/v1',
  useMockApi: true,
  mockInterceptors: [mockApiInterceptor] as HttpInterceptorFn[],
};
