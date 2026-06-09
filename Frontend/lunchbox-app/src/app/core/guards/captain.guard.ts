import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const captainGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getCurrentUser();
  if (user && (user.role === 'captain' || user.role === 'admin')) {
    return true;
  }

  return router.createUrlTree(['/tracking']);
};
