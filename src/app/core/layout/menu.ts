export interface MenuEntry {
  label: string; // chave i18n
  icon: string; // classe do PrimeIcons
  route: string;
}

export const MENU: readonly MenuEntry[] = [
  { label: 'menu.dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
  { label: 'menu.transactions', icon: 'pi pi-list', route: '/transactions' },
  { label: 'menu.accounts', icon: 'pi pi-wallet', route: '/accounts' },
  { label: 'menu.categories', icon: 'pi pi-tags', route: '/categories' },
  { label: 'menu.creditCards', icon: 'pi pi-credit-card', route: '/credit-cards' },
  { label: 'menu.budgets', icon: 'pi pi-chart-bar', route: '/budgets' },
  { label: 'menu.investments', icon: 'pi pi-chart-line', route: '/investments' },
];
