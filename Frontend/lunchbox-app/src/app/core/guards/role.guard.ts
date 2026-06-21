import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/delivery.models';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowedRoles: UserRole[], fallback = '/home'): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.hasAnyRole(allowedRoles)) {
      return true;
    }

    return router.createUrlTree([fallback]);
  };
}
