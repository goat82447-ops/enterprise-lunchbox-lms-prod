import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { BookingComponent } from './features/booking/booking.component';
import { AccountComponent } from './features/account/account.component';
import { TrackingComponent } from './features/tracking/tracking.component';
import { AdminComponent } from './features/admin/admin.component';
import { AuditComponent } from './features/audit/audit.component';
import { CaptainProfileComponent } from './features/captain-profile/captain-profile.component';
import { AboutUsComponent } from './features/about-us/about-us.component';
import { ContactComponent } from './features/contact/contact.component';
import { ServicesComponent } from './core/services/services.component';
import { TravelComponent } from './features/travel/travel.component';
import { PaymentComponent } from './features/payment/payment.component';
import { CartComponent } from './components/cart/cart.component';
import { OrderComponent } from './components/order/order.component';
import { TrackingComponent as OrderTrackingComponent } from './components/tracking/tracking.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { captainGuard } from './core/guards/captain.guard';
import { customerGuard } from './core/guards/customer.guard';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'home', component: HomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'services', component: ServicesComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'travel', component: TravelComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'activity', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'account', component: AccountComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'payment', component: PaymentComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'about-us', component: AboutUsComponent },
	{ path: 'contact', component: ContactComponent },
	{ path: 'lunchbox-delivery', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'school-booking', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/hotels', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/menu/:hotelId', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'cart', component: CartComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order', component: OrderComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking', component: OrderTrackingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking/:id', component: OrderTrackingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'tracking', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'tracking/:id', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'captain-profile', component: CaptainProfileComponent, canActivate: [authGuard, captainGuard] },
	{ path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'audit', component: AuditComponent, canActivate: [authGuard, adminGuard] },
	{ path: '**', redirectTo: '/' }
];

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'home', component: HomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'services', component: ServicesComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'activity', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'account', component: AccountComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'payment', component: PaymentComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'about-us', component: AboutUsComponent },
	{ path: 'contact', component: ContactComponent },
	{ path: 'lunchbox-delivery', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'school-booking', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/hotels', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking/food/menu/:hotelId', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'booking', component: BookingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'cart', component: CartComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order', component: OrderComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking', component: OrderTrackingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'order-tracking/:id', component: OrderTrackingComponent, canActivate: [authGuard, customerGuard] },
	{ path: 'tracking', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'tracking/:id', component: TrackingComponent, canActivate: [authGuard] },
	{ path: 'captain-profile', component: CaptainProfileComponent, canActivate: [authGuard, captainGuard] },
	{ path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'audit', component: AuditComponent, canActivate: [authGuard, adminGuard] },
	{ path: '**', redirectTo: '/' }
];
