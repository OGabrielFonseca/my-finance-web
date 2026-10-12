import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const slate = {
  50: '{slate.50}',
  100: '{slate.100}',
  200: '{slate.200}',
  300: '{slate.300}',
  400: '{slate.400}',
  500: '{slate.500}',
  600: '{slate.600}',
  700: '{slate.700}',
  800: '{slate.800}',
  900: '{slate.900}',
  950: '{slate.950}',
};

/** Aura com primária monocromática (Noir) sobre surface slate. */
export const MyFinancePreset = definePreset(Aura, {
  semantic: {
    primary: slate,
    colorScheme: {
      light: {
        surface: { 0: '#ffffff', ...slate },
        primary: {
          color: '{slate.950}',
          inverseColor: '#ffffff',
          hoverColor: '{slate.900}',
          activeColor: '{slate.800}',
        },
        highlight: {
          background: '{slate.950}',
          focusBackground: '{slate.700}',
          color: '#ffffff',
          focusColor: '#ffffff',
        },
      },
      dark: {
        surface: { 0: '#ffffff', ...slate },
        primary: {
          color: '{slate.50}',
          inverseColor: '{slate.950}',
          hoverColor: '{slate.100}',
          activeColor: '{slate.200}',
        },
        highlight: {
          background: 'rgba(248, 250, 252, .16)',
          focusBackground: 'rgba(248, 250, 252, .24)',
          color: 'rgba(255, 255, 255, .87)',
          focusColor: 'rgba(255, 255, 255, .87)',
        },
      },
    },
  },
});
