import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'mf.theme';
const DARK_CLASS = 'app-dark';

/** Preferência de tema (claro, escuro ou do sistema), salva no localStorage e aplicada como classe no <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(readPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly isDark = computed(() => {
    const preference = this.preferenceState();
    return preference === 'dark' || (preference === 'system' && this.systemDark());
  });

  constructor() {
    this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark()));
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
}

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
