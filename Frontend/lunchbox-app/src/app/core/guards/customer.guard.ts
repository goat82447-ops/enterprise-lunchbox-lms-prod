import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getCurrentUser();
  if (user && (user.role === 'customer' || user.role === 'user')) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
