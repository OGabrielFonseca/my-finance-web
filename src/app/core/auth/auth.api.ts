import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import type { LoginRequest, RegisterRequest, TokenResponse, User } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(body: LoginRequest, context?: HttpContext): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, body, { context });
  }

  register(body: RegisterRequest, context?: HttpContext): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/register`, body, { context });
  }

  me(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/me`);
  }
}
