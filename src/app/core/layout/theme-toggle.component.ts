import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';

import type { ThemePreference } from '../theme/theme.service';
import { ThemeService } from '../theme/theme.service';

interface ThemeOption {
  value: ThemePreference;
  icon: string;
}

@Component({
  selector: 'app-theme-toggle',
  imports: [FormsModule, SelectButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" [attr.aria-label]="'Tema'">
      <p-selectbutton
        [options]="options"
        [ngModel]="theme.preference()"
        (ngModelChange)="theme.setPreference($event)"
        optionValue="value"
        [allowEmpty]="false"
        size="small"
      >
        <ng-template #item let-option>
          <i [class]="option.icon" [attr.aria-label]="'theme.' + option.value"></i>
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
