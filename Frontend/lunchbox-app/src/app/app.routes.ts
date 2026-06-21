import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { captainGuard } from './core/guards/captain.guard';
import { customerGuard } from './core/guards/customer.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
	{ path: 'home', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
	{ path: 'login', loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./features/register/register.component').then((m) => m.RegisterComponent) },
	{ path: 'role-dashboard', loadComponent: () => import('./features/role-dashboard/role-dashboard.component').then((m) => m.RoleDashboardComponent), canActivate: [authGuard] },
	{ path: 'services', loadComponent: () => import('./core/services/services.component').then((m) => m.ServicesComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'travel', redirectTo: 'booking', pathMatch: 'full' },
	{ path: 'ride-live', loadComponent: () => import('./features/ride-live/ride-live.component').then((m) => m.RideLiveComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'ride-live/:id', loadComponent: () => import('./features/ride-live/ride-live.component').then((m) => m.RideLiveComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'activity', loadComponent: () => import('./features/tracking/tracking.component').then((m) => m.TrackingComponent), canActivate: [authGuard] },
	{ path: 'account', loadComponent: () => import('./features/account/account.component').then((m) => m.AccountComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'payment', loadComponent: () => import('./features/payment/payment.component').then((m) => m.PaymentComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'about-us', loadComponent: () => import('./features/about-us/about-us.component').then((m) => m.AboutUsComponent) },
	{ path: 'contact', loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent) },
	{ path: 'lunchbox-delivery', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'school-booking', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'booking/quickbook', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/hotels', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/menu/:hotelId', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'booking', loadComponent: () => import('./features/booking/booking.component').then((m) => m.BookingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'cart', loadComponent: () => import('./components/cart/cart.component').then((m) => m.CartComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'order', loadComponent: () => import('./components/order/order.component').then((m) => m.OrderComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking', loadComponent: () => import('./components/tracking/tracking.component').then((m) => m.TrackingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking/:id', loadComponent: () => import('./components/tracking/tracking.component').then((m) => m.TrackingComponent), canActivate: [authGuard, customerGuard] },
	{ path: 'tracking', loadComponent: () => import('./features/tracking/tracking.component').then((m) => m.TrackingComponent), canActivate: [authGuard] },
	{ path: 'tracking/:id', loadComponent: () => import('./features/tracking/tracking.component').then((m) => m.TrackingComponent), canActivate: [authGuard] },
	{ path: 'captain-profile', loadComponent: () => import('./features/captain-profile/captain-profile.component').then((m) => m.CaptainProfileComponent), canActivate: [authGuard, captainGuard] },
	{ path: 'driver-hub', loadComponent: () => import('./features/driver-hub/driver-hub.component').then((m) => m.DriverHubComponent), canActivate: [authGuard, captainGuard] },
	{ path: 'captain-rides', loadComponent: () => import('./features/captain-rides/captain-rides.component').then((m) => m.CaptainRidesComponent), canActivate: [authGuard, captainGuard] },
	{ path: 'captain-bank', loadComponent: () => import('./features/captain_bank/captain_bank.component').then((m) => m.CaptainBankComponent), canActivate: [authGuard, captainGuard] },
	{ path: 'admin', loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent), canActivate: [authGuard, adminGuard] },
	{ path: 'audit', loadComponent: () => import('./features/audit/audit.component').then((m) => m.AuditComponent), canActivate: [authGuard, adminGuard] },
	{ path: 'fleet-owner', loadComponent: () => import('./features/role-dashboard/role-dashboard.component').then((m) => m.RoleDashboardComponent), canActivate: [authGuard, roleGuard(['fleet_owner', 'admin'], '/role-dashboard')] },
	{ path: 'support-desk', loadComponent: () => import('./features/role-dashboard/role-dashboard.component').then((m) => m.RoleDashboardComponent), canActivate: [authGuard, roleGuard(['support_executive', 'admin'], '/role-dashboard')] },
	{ path: 'safety', loadComponent: () => import('./features/safety/safety.component').then((m) => m.SafetyComponent), canActivate: [authGuard] },
	{ path: 'rewards', loadComponent: () => import('./features/rewards/rewards.component').then((m) => m.RewardsComponent), canActivate: [authGuard] },
	{ path: 'power-pass', loadComponent: () => import('./features/power-pass/power-pass.component').then((m) => m.PowerPassComponent), canActivate: [authGuard] },
	{ path: 'coins', loadComponent: () => import('./features/coins/coins.component').then((m) => m.CoinsComponent), canActivate: [authGuard] },
	{ path: 'claims', loadComponent: () => import('./features/claims/claims.component').then((m) => m.ClaimsComponent), canActivate: [authGuard] },
	{ path: 'settings', loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent), canActivate: [authGuard] },
	{ path: '**', redirectTo: '/' }
];
