import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButton } from 'primeng/selectbutton';

import type { ThemePreference } from '../theme/theme.service';
import { ThemeService } from '../theme/theme.service';

interface ThemeOption {
  value: ThemePreference;
  icon: string;
}

@Component({
  selector: 'app-theme-toggle',
  imports: [FormsModule, SelectButton, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" [attr.aria-label]="'theme.label' | transloco">
      <p-selectbutton
        [options]="options"
        [ngModel]="theme.preference()"
        (ngModelChange)="theme.setPreference($event)"
        optionValue="value"
        [allowEmpty]="false"
        size="small"
      >
        <ng-template #item let-option>
          <i [class]="option.icon" [attr.aria-label]="'theme.' + option.value | transloco"></i>
        </ng-template>
      </p-selectbutton>
    </div>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly options: ThemeOption[] = [
    { value: 'light', icon: 'pi pi-sun' },
    { value: 'dark', icon: 'pi pi-moon' },
    { value: 'system', icon: 'pi pi-desktop' },
  ];
}
