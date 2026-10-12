import { expectTypeOf } from 'vitest';

import type { ApiResponse, ApiSchema } from './api-types';

type Account = ApiResponse<'AccountResponse', 'institution'>;

describe('ApiResponse', () => {
  it('remove o opcional dos campos de resposta', () => {
    expectTypeOf<Account['id']>().toEqualTypeOf<string>();
    expectTypeOf<Account['archived']>().toEqualTypeOf<boolean>();
  });

  it('mantém null só nos campos declarados', () => {
    expectTypeOf<Account['institution']>().toEqualTypeOf<string | null>();
  });

  it('ApiSchema mantém o schema bruto (requests)', () => {
    expectTypeOf<ApiSchema<'CreateAccountRequest'>['name']>().toEqualTypeOf<string>();
  });
});
