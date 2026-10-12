import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

type Listener = (event: MediaQueryListEvent) => void;

/** jsdom não tem matchMedia: simula o "prefers-color-scheme" e devolve uma função para mudá-lo. */
function mockSystemDark(matches: boolean): (dark: boolean) => void {
  const listeners: Listener[] = [];
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches, addEventListener: (_type: string, listener: Listener) => listeners.push(listener) }),
  });
  return (dark) => listeners.forEach((listener) => listener({ matches: dark } as MediaQueryListEvent));
}

const hasDarkClass = () => document.documentElement.classList.contains('app-dark');

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  it('usa a preferência do sistema por padrão', () => {
    mockSystemDark(true);
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.preference()).toBe('system');
    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('acompanha a mudança do sistema quando a preferência é "system"', () => {
    const setSystemDark = mockSystemDark(false);
    const service = TestBed.inject(ThemeService);

    setSystemDark(true);
    TestBed.tick();

    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('grava a preferência escolhida e aplica a classe', () => {
    mockSystemDark(true);
    const service = TestBed.inject(ThemeService);

    service.setPreference('light');
    TestBed.tick();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(hasDarkClass()).toBe(false);
  });

  it('lê a preferência salva', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(TestBed.inject(ThemeService).isDark()).toBe(true);
  });

  it('ignora valor inválido no storage', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'azul');

    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });
});
