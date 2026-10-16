export interface MenuEntry {
  label: string; // chave i18n
  icon: string; // classe do PrimeIcons
  route: string;
}

export const MENU: readonly MenuEntry[] = [
  { label: 'Dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
  { label: 'Lançamentos', icon: 'pi pi-list', route: '/transactions' },
  { label: 'Contas', icon: 'pi pi-wallet', route: '/accounts' },
  { label: 'Categorias', icon: 'pi pi-tags', route: '/categories' },
  { label: 'Cartões', icon: 'pi pi-credit-card', route: '/credit-cards' },
  { label: 'Orçamentos', icon: 'pi pi-chart-bar', route: '/budgets' },
  { label: 'Investimentos', icon: 'pi pi-chart-line', route: '/investments' },
  { label: 'Integrações', icon: 'pi pi-link', route: '/integrations' },
];
