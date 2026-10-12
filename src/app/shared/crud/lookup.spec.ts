import { of, throwError } from 'rxjs';

import type { PageResponse } from '../data/page';
import { Lookup } from './lookup';

const page = (items: string[]): PageResponse<string> => ({
  items,
  page: 0,
  size: 100,
  totalItems: items.length,
  totalPages: 1,
});

describe('Lookup', () => {
  it('carrega uma vez só', () => {
    const loader = vi.fn(() => of(page(['a', 'b'])));
    const lookup = new Lookup(loader);

    lookup.ensureLoaded();
    lookup.ensureLoaded();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(lookup.items()).toEqual(['a', 'b']);
    expect(lookup.loaded()).toBe(true);
  });

  it('invalidate recarrega se já estava carregado', () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce(of(page(['a'])))
      .mockReturnValueOnce(of(page(['a', 'c'])));
    const lookup = new Lookup<string>(loader);
    lookup.ensureLoaded();

    lookup.invalidate();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(lookup.items()).toEqual(['a', 'c']);
  });

  it('invalidate não carrega se ninguém pediu ainda', () => {
    const loader = vi.fn(() => of(page([])));
    new Lookup(loader).invalidate();
    expect(loader).not.toHaveBeenCalled();
  });

  it('erro permite tentar de novo', () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('x')))
      .mockReturnValueOnce(of(page(['a'])));
    const lookup = new Lookup<string>(loader);

    lookup.ensureLoaded();
    lookup.ensureLoaded();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(lookup.items()).toEqual(['a']);
  });
});
