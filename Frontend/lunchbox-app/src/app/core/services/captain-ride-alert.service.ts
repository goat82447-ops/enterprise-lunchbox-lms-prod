import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { BookingService } from './booking.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { Booking } from '../models/delivery.models';

export interface RideAlertEvent {
  booking: Booking;
  receivedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CaptainRideAlertService implements OnDestroy {
  /** Emits every time a brand-new ride is detected for this captain */
  readonly newRide$ = new Subject<RideAlertEvent>();

  private readonly notifiedIds = new Set<string>();
  private readonly destroy$ = new Subject<void>();
  private pollSub?: Subscription;

  constructor(
    private bookingService: BookingService,
    private auth: AuthService,
    private notifications: NotificationService
  ) {
    // Start polling whenever a captain is logged in
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.pollSub?.unsubscribe();
      this.notifiedIds.clear();

      if (user?.role === 'captain' || user?.role === 'admin') {
        this.startPolling();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Play the loud 3-note rising alert sound */
  playAlertSound(): void {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Rising 3-note alarm: 880 Hz → 1046 Hz → 1318 Hz at near-max volume
    const notes = [
      { freq: 880,  startAt: 0.00, dur: 0.18 },
      { freq: 1046, startAt: 0.22, dur: 0.18 },
      { freq: 1318, startAt: 0.44, dur: 0.30 },
    ];

    notes.forEach(({ freq, startAt, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';            // square wave = louder, punchy
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + dur + 0.02);
    });

    // Repeat once after 0.9 s for emphasis
    setTimeout(() => {
      notes.forEach(({ freq, startAt, dur }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
        gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startAt);
        osc.stop(ctx.currentTime + startAt + dur + 0.02);
      });
      setTimeout(() => ctx.close().catch(() => void 0), 1200);
    }, 900);
  }

  /** Request browser notification permission */
  requestPermission(): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => void 0);
    }
  }

  private startPolling(): void {
    this.pollSub = this.bookingService.bookings$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookings) => {
        const activeNew = bookings.filter(
          (b) => b.status === 'created' && !this.notifiedIds.has(b.id)
        );

        for (const booking of activeNew) {
          this.notifiedIds.add(booking.id);
          this.fireAlert(booking);
        }
      });
  }

  private fireAlert(booking: Booking): void {
    this.playAlertSound();

    const msg = `🔔 New ride ${booking.id}: ${booking.pickup.address} → ${booking.drop.address}`;
    this.notifications.push(msg, 'info');

    this.newRide$.next({ booking, receivedAt: new Date().toISOString() });

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('🚗 New Ride Request!', {
        body: `${booking.pickup.address} → ${booking.drop.address}\n💰 ₹${booking.estimatedFare || '—'}`,
        tag: `ride-${booking.id}`,
        requireInteraction: true   // stays on screen until captain acts
      });
    }
  }
}
