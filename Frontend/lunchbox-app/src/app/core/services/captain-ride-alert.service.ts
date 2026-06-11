import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Booking } from '../models/delivery.models';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { NotificationService } from './notification.service';

const ALERT_COUNTDOWN_SECONDS = 25;

@Injectable({ providedIn: 'root' })
export class CaptainRideAlertService implements OnDestroy {
  private readonly incomingRideSubject = new BehaviorSubject<Booking | null>(null);
  readonly incomingRide$ = this.incomingRideSubject.asObservable();

  private readonly countdownSubject = new BehaviorSubject<number>(ALERT_COUNTDOWN_SECONDS);
  readonly countdown$ = this.countdownSubject.asObservable();

  private readonly countdownPctSubject = new BehaviorSubject<number>(100);
  readonly countdownPct$ = this.countdownPctSubject.asObservable();

  private readonly notifiedRideIds = new Set<string>();
  private alertTimer: ReturnType<typeof setInterval> | null = null;
  private soundInterval: ReturnType<typeof setInterval> | null = null;
  private bookingsSub: Subscription | null = null;
  private audioUnlocked = false;

  readonly rideAccepted$ = new Subject<string>();
  readonly rideDeclined$ = new Subject<string>();

  constructor(
    private auth: AuthService,
    private bookingService: BookingService,
    private notifications: NotificationService
  ) {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;
        const AudioCtx = this.getAudioCtx();
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume().then(() => ctx.close()).catch(() => void 0);
        }
        window.removeEventListener('click', unlock, true);
        window.removeEventListener('touchstart', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      };
      window.addEventListener('click', unlock, true);
      window.addEventListener('touchstart', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }

    this.auth.user$.subscribe(user => {
      if (user?.role === 'captain') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => void 0);
        }
      }
    });

    this.bookingsSub = this.bookingService.bookings$.subscribe(() => {
      if (this.auth.isCaptain()) {
        this.checkForIncomingRides();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.bookingsSub?.unsubscribe();
  }

  get incomingRide(): Booking | null {
    return this.incomingRideSubject.value;
  }

  acceptRide(): void {
    const ride = this.incomingRideSubject.value;
    if (!ride) return;
    const rideId = ride.id;
    this.clearTimers();
    this.incomingRideSubject.next(null);
    const result = this.bookingService.approveByCaptain(rideId);
    if (result.success) {
      this.notifications.push(`Ride ${rideId} accepted! Head to pickup location.`, 'success');
      this.rideAccepted$.next(rideId);
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

  private checkForIncomingRides(): void {
    const current = this.incomingRideSubject.value;
    if (current) {
      const live = this.bookingService.getAllBookingsSnapshot().find(b => b.id === current.id);
      if (live && live.status !== 'created') {
        this.clearTimers();
        this.incomingRideSubject.next(null);
        this.notifications.push('Ride was accepted by another captain.', 'info');
        return;
      }
    }

    const allBookings = this.bookingService.getAllBookingsSnapshot();
    const pendingRides = allBookings.filter(b =>
      b.status === 'created' && b.notificationTarget === 'all'
    );

    for (const ride of pendingRides) {
      if (this.notifiedRideIds.has(ride.id)) continue;
      this.notifiedRideIds.add(ride.id);
      this.showAlert(ride);

      const message = `New ${ride.serviceType} ride: ${this.shortAddr(ride.pickup.address)} to ${this.shortAddr(ride.drop.address)} Rs.${ride.estimatedFare || '0'}`;
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('New Ride Request!', {
          body: message,
          tag: `ride-${ride.id}`,
          icon: '/assets/lunchbox-logo.svg',
          requireInteraction: true
        });
      }
    }
  }

  showAlert(ride: Booking): void {
    this.clearTimers();
    this.incomingRideSubject.next(ride);
    this.countdownSubject.next(ALERT_COUNTDOWN_SECONDS);
    this.countdownPctSubject.next(100);
    this.playAlertSound();
    this.soundInterval = setInterval(() => this.playAlertSound(), 1200);
    this.alertTimer = setInterval(() => {
      const next = this.countdownSubject.value - 1;
      this.countdownSubject.next(next);
      this.countdownPctSubject.next((next / ALERT_COUNTDOWN_SECONDS) * 100);
      if (next <= 0) { this.declineRide(); }
    }, 1000);
  }

  private clearTimers(): void {
    if (this.alertTimer) { clearInterval(this.alertTimer); this.alertTimer = null; }
    if (this.soundInterval) { clearInterval(this.soundInterval); this.soundInterval = null; }
  }

  private getAudioCtx(): typeof AudioContext | null {
    return (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      || null;
  }

  private playAlertSound(): void {
    const AudioCtx = this.getAudioCtx();
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const doPlay = () => {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6, ctx.currentTime);
      compressor.knee.setValueAtTime(0, ctx.currentTime);
      compressor.ratio.setValueAtTime(20, ctx.currentTime);
      compressor.attack.setValueAtTime(0.001, ctx.currentTime);
      compressor.release.setValueAtTime(0.1, ctx.currentTime);
      compressor.connect(ctx.destination);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      masterGain.connect(compressor);
      const beeps = [
        { freq: 1200, start: 0,    dur: 0.14 },
        { freq: 1500, start: 0.17, dur: 0.14 },
        { freq: 1800, start: 0.34, dur: 0.14 },
        { freq: 2100, start: 0.51, dur: 0.20 },
      ];
      beeps.forEach(b => {
        [-4, 0, 4].forEach(detune => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = b.freq;
          osc.detune.value = detune;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + b.start);
          gain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + b.start + 0.008);
          gain.gain.setValueAtTime(1.0, ctx.currentTime + b.start + b.dur - 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + b.start + b.dur);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(ctx.currentTime + b.start);
          osc.stop(ctx.currentTime + b.start + b.dur + 0.01);
        });
      });
      setTimeout(() => ctx.close().catch(() => void 0), 900);
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => void 0);
    } else {
      doPlay();
    }
  }

  private shortAddr(addr: string): string {
    if (!addr) return '';
    return addr.split(',').slice(0, 2).join(',').trim();
  }
}
