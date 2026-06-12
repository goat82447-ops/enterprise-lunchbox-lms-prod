import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { AppUser, Booking } from '../models/delivery.models';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { NotificationService } from './notification.service';

const ALERT_COUNTDOWN = 25;

@Injectable({ providedIn: 'root' })
export class CaptainRideAlertService implements OnDestroy {
  private incomingRideSubject = new BehaviorSubject<Booking | null>(null);
  readonly incomingRide$ = this.incomingRideSubject.asObservable();

  private countdownSubject = new BehaviorSubject<number>(ALERT_COUNTDOWN);
  readonly countdown$ = this.countdownSubject.asObservable();

  private countdownPctSubject = new BehaviorSubject<number>(100);
  readonly countdownPct$ = this.countdownPctSubject.asObservable();

  readonly rideAccepted$ = new Subject<string>();
  readonly rideDeclined$ = new Subject<string>();

  private notifiedRideIds = new Set<string>();
  private alertTimer: ReturnType<typeof setInterval> | null = null;
  private soundInterval: ReturnType<typeof setInterval> | null = null;
  private bookingsSub: Subscription | null = null;
  private audioUnlocked = false;

  constructor(
    private auth: AuthService,
    private bookingService: BookingService,
    private notifications: NotificationService
  ) {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;
        const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
          || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) { const c = new AC(); c.resume().then(() => c.close()).catch(() => void 0); }
        ['click', 'touchstart', 'keydown'].forEach(e => window.removeEventListener(e, unlock, true));
      };
      ['click', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, unlock, true));
    }
    this.auth.user$.subscribe(user => {
      if (user?.role === 'captain' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => void 0);
      }
    });
    this.bookingsSub = this.bookingService.bookings$.subscribe(() => {
      if (this.auth.isCaptain()) this.checkForIncomingRides();
    });
  }

  ngOnDestroy(): void { this.clearTimers(); this.bookingsSub?.unsubscribe(); }

  get incomingRide(): Booking | null { return this.incomingRideSubject.value; }

  requestPermission(): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => void 0);
    }
  }

  acceptRide(): void {
    const ride = this.incomingRideSubject.value;
    if (!ride) return;
    this.clearTimers();
    this.incomingRideSubject.next(null);
    const result = this.bookingService.approveByCaptain(ride.id);
    if (result.success) {
      this.notifications.push(`Ride ${ride.id} accepted! Head to pickup: ${ride.pickup.address}`, 'success');
      this.rideAccepted$.next(ride.id);
    } else {
      this.notifications.push('Ride was already accepted by another captain.', 'warning');
    }
  }

  declineRide(): void {
    const ride = this.incomingRideSubject.value;
    if (!ride) return;
    this.clearTimers();
    this.notifications.push(`Ride ${ride.id} declined.`, 'warning');
    this.rideDeclined$.next(ride.id);
    this.incomingRideSubject.next(null);
  }

  showAlert(ride: Booking): void {
    this.clearTimers();
    this.incomingRideSubject.next(ride);
    this.countdownSubject.next(ALERT_COUNTDOWN);
    this.countdownPctSubject.next(100);
    this.playAlertSound();
    this.soundInterval = setInterval(() => this.playAlertSound(), 1200);
    this.alertTimer = setInterval(() => {
      const next = this.countdownSubject.value - 1;
      this.countdownSubject.next(next);
      this.countdownPctSubject.next((next / ALERT_COUNTDOWN) * 100);
      if (next <= 0) this.declineRide();
    }, 1000);
  }

  playAlertSound(): void {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    const run = () => {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-6, ctx.currentTime);
      comp.ratio.setValueAtTime(20, ctx.currentTime);
      comp.attack.setValueAtTime(0.001, ctx.currentTime);
      comp.release.setValueAtTime(0.1, ctx.currentTime);
      comp.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.0, ctx.currentTime);
      master.connect(comp);
      [
        { f: 1200, s: 0.00, d: 0.14 },
        { f: 1500, s: 0.17, d: 0.14 },
        { f: 1800, s: 0.34, d: 0.14 },
        { f: 2100, s: 0.51, d: 0.20 }
      ].forEach(b => {
        [-4, 0, 4].forEach(det => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = b.f;
          o.detune.value = det;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + b.s);
          g.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + b.s + 0.008);
          g.gain.setValueAtTime(1.0, ctx.currentTime + b.s + b.d - 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + b.s + b.d);
          o.connect(g);
          g.connect(master);
          o.start(ctx.currentTime + b.s);
          o.stop(ctx.currentTime + b.s + b.d + 0.01);
        });
      });
      setTimeout(() => ctx.close().catch(() => void 0), 900);
    };
    if (ctx.state === 'suspended') { ctx.resume().then(run).catch(() => void 0); } else { run(); }
  }

  private checkForIncomingRides(): void {
    const captain = this.auth.getCurrentUser();
    if (!captain) return;

    const current = this.incomingRideSubject.value;
    if (current) {
      const live = this.bookingService.getAllBookingsSnapshot().find((b: Booking) => b.id === current.id);
      if (live && live.status !== 'created') {
        this.clearTimers();
        this.incomingRideSubject.next(null);
        this.notifications.push('Ride was accepted by another captain.', 'info');
        return;
      }
    }
    const pending = this.bookingService.getAllBookingsSnapshot()
      .filter((b: Booking) => b.status === 'created' && this.isRideForCaptain(b, captain));
    for (const ride of pending) {
      if (this.notifiedRideIds.has(ride.id)) continue;
      this.notifiedRideIds.add(ride.id);
      this.showAlert(ride);
      this.notifications.push(
        `New ride request ${ride.id}: ${ride.pickup.address.split(',')[0]} to ${ride.drop.address.split(',')[0]}.`,
        'warning'
      );
      this.notifications.playSound('alert');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('New Ride Request!', {
          body: `${ride.serviceType} ride: ${ride.pickup.address.split(',')[0]} to ${ride.drop.address.split(',')[0]} - Rs.${ride.estimatedFare || 0}`,
          tag: `ride-${ride.id}`,
          icon: '/assets/lunchbox-logo.svg',
          requireInteraction: true,
          silent: false
        });
      }
    }
  }

  private isRideForCaptain(ride: Booking, captain: AppUser): boolean {
    if (ride.notificationTarget === 'all') return true;

    const captainId = String(captain.id || '').trim().toLowerCase();
    const captainUserName = String(captain.username || '').trim().toLowerCase();
    const captainDisplayName = String(captain.displayName || '').trim().toLowerCase();
    const preferredCaptainId = String(ride.preferredCaptainId || '').trim().toLowerCase();
    const preferredCaptainName = String(ride.preferredCaptainName || '').trim().toLowerCase();
    const assignedCaptainId = String(ride.captainId || '').trim().toLowerCase();
    const driverName = String(ride.driverName || '').trim().toLowerCase();

    return Boolean(
      (preferredCaptainId.length > 0 && (preferredCaptainId === captainId || preferredCaptainId === captainUserName)) ||
      (assignedCaptainId.length > 0 && (assignedCaptainId === captainId || assignedCaptainId === captainUserName)) ||
      (preferredCaptainName.length > 0 && (preferredCaptainName === captainDisplayName || preferredCaptainName === captainUserName)) ||
      (driverName.length > 0 && (driverName === captainDisplayName || driverName === captainUserName))
    );
  }

  private clearTimers(): void {
    if (this.alertTimer) { clearInterval(this.alertTimer); this.alertTimer = null; }
    if (this.soundInterval) { clearInterval(this.soundInterval); this.soundInterval = null; }
  }
}
