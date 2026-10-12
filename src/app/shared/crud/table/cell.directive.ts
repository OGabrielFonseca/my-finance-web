import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Célula customizada da <app-data-table>: `<ng-template appCell="name" let-row>...</ng-template>`. */
@Directive({ selector: '[appCell]' })
export class CellDirective {
  readonly key = input.required<string>({ alias: 'appCell' });
  readonly template = inject(TemplateRef);
}
