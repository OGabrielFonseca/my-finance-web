import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { User } from '@core/auth/auth.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import type { UpdateProfileRequest } from './profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  update(body: UpdateProfileRequest, context?: HttpContext): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/me`, body, { context });
  }
}
