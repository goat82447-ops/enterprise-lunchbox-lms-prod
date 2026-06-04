import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { BookingComponent } from './features/booking/booking.component';
import { TrackingComponent } from './features/tracking/tracking.component';
import { AdminComponent } from './features/admin/admin.component';
import { AuditComponent } from './features/audit/audit.component';
import { CaptainProfileComponent } from './features/captain-profile/captain-profile.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { captainGuard } from './core/guards/captain.guard';
import { customerGuard } from './core/guards/customer.guard';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'home', component: HomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'booking', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'tracking', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'tracking/:id', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'captain-profile', component: CaptainProfileComponent, canActivate: [authGuard, captainGuard] },
	{ path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'audit', component: AuditComponent, canActivate: [authGuard, adminGuard] },
	{ path: '**', redirectTo: '/' }
];
