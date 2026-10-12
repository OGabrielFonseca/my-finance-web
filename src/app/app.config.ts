import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';

import { environment } from '@env/environment';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideAuth } from './core/auth/auth.providers';
import { errorInterceptor } from './core/http/error.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';
import { provideI18n } from './core/i18n/i18n.providers';
import { MyFinancePreset } from './core/theme/my-finance.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, languageInterceptor, errorInterceptor, ...environment.mockInterceptors]),
    ),
    providePrimeNG({
      theme: {
        preset: MyFinancePreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: false,
    }),
    MessageService,
    ConfirmationService,
    DialogService,
    ...provideI18n(),
    provideAuth(),
  ],
};
