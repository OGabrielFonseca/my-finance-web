import type { Signal } from '@angular/core';

export interface MenuEntry {
  label: string; // texto do item (em português, direto no código)
  icon: string; // classe do PrimeIcons
  route: string;
  /** Contador exibido ao lado do item; o item só mostra o badge quando o valor é maior que zero. */
  badge?: Signal<number>;
}

/** Itens do menu. O contador de importações vem de fora porque o store é uma instância injetada no shell. */
export function buildMenu(importPending: Signal<number>): readonly MenuEntry[] {
  return [
    { label: 'Dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
    { label: 'Lançamentos', icon: 'pi pi-list', route: '/transactions' },
    { label: 'Importações', icon: 'pi pi-inbox', route: '/imports', badge: importPending },
    { label: 'Contas', icon: 'pi pi-wallet', route: '/accounts' },
    { label: 'Categorias', icon: 'pi pi-tags', route: '/categories' },
    { label: 'Cartões', icon: 'pi pi-credit-card', route: '/credit-cards' },
    { label: 'Orçamentos', icon: 'pi pi-chart-bar', route: '/budgets' },
    { label: 'Investimentos', icon: 'pi pi-chart-line', route: '/investments' },
    { label: 'Integrações', icon: 'pi pi-link', route: '/integrations' },
  ];
}
