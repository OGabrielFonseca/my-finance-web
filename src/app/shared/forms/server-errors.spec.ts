import { FormControl, FormGroup } from '@angular/forms';

import { ApiError } from '../data/api-error';
import { applyServerErrors } from './server-errors';

describe('applyServerErrors', () => {
  const validation = (errors: { field: string; message: string }[]) =>
    new ApiError(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', errors);

  it('marca o controle com errors.server', () => {
    const form = new FormGroup({ amount: new FormControl(0) });

    const unmatched = applyServerErrors(form, validation([{ field: 'amount', message: 'deve ser maior que 0' }]));

    expect(form.controls.amount.errors).toEqual({ server: 'deve ser maior que 0' });
    expect(form.controls.amount.touched).toBe(true);
    expect(unmatched).toEqual([]);
  });

  it('usa o mapeamento quando o nome difere', () => {
    const form = new FormGroup({ date: new FormControl(null) });

    applyServerErrors(form, validation([{ field: 'transactionDate', message: 'obrigatório' }]), {
      transactionDate: 'date',
    });

    expect(form.controls.date.errors).toEqual({ server: 'obrigatório' });
  });

  it('devolve as mensagens sem controle', () => {
    const form = new FormGroup({ name: new FormControl('') });
    expect(applyServerErrors(form, validation([{ field: 'outro', message: 'm1' }]))).toEqual(['m1']);
  });
});
