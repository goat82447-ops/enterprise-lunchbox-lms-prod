import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasAnyRole(['customer', 'rider', 'user', 'admin'])) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
