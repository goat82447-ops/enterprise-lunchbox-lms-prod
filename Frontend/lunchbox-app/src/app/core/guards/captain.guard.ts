import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const captainGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasAnyRole(['driver', 'captain', 'admin'])) {
    return true;
  }

  return router.createUrlTree(['/tracking']);
};
