import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, fromEvent, interval, map, of, retry, switchMap, timer } from 'rxjs';
import { Booking, BookingRequest, BookingStatus } from '../models/delivery.models';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'delivery_bookings';
const BOOKINGS_API = `${environment.parcelApiBase}/api/bookings`;
const EVENTS_API = `${environment.parcelApiBase}/api/events`;
const BROADCAST_CHANNEL_NAME = 'routex_bookings';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private static readonly FOOD_CONFIRMATION_DELAY_MINUTES = 2;
  private static readonly CAPTAIN_ACCEPT_TIMEOUT_MINUTES = 20;
  private readonly bookingsSubject = new BehaviorSubject<Booking[]>(this.loadBookings());
  readonly bookings$: Observable<Booking[]> = this.bookingsSubject.asObservable();
  private readonly notifiedBookingIds = new Set<string>();
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private sseRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private notifications: NotificationService,
    private http: HttpClient,
    private auth: AuthService
  ) {
    // Wake up Render free-tier server on app start (avoids first-request cold start delay)
    this.http.get(`${environment.parcelApiBase}/health`, { responseType: 'text' })
      .subscribe({ error: () => void 0 });
    // Re-ping every 5 minutes to keep Render server awake
    interval(5 * 60 * 1000)
      .subscribe(() => this.http.get(`${environment.parcelApiBase}/health`, { responseType: 'text' })
        .subscribe({ error: () => void 0 }));

    // BroadcastChannel: instant cross-tab real-time (customer → captain on same browser/device)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_BOOKING' && event.data?.booking) {
          this.upsertBooking(event.data.booking as Booking);
        }
        if (event.data?.type === 'BOOKINGS_UPDATED') {
          const latest = this.loadBookings();
          this.bookingsSubject.next(latest);
        }
      };
    }

    interval(6000).subscribe(() => this.tickBookings());

    if (typeof window !== 'undefined') {
      fromEvent<StorageEvent>(window, 'storage').subscribe((event) => {
        if (event.key !== STORAGE_KEY) {
          return;
        }

        const latest = this.loadBookings();
        this.bookingsSubject.next(latest);
      });
    }

    this.auth.user$.pipe(
      distinctUntilChanged((prev, curr) => (prev?.id ?? null) === (curr?.id ?? null))
    ).subscribe((user) => {
      if (!user) {
        this.persist([]);
        this.disconnectSse();
        return;
      }

      this.syncBookingsFromServer(true);
      // Connect SSE for real-time cross-device push (captains receive instant notifications)
      this.connectSse();
    });

    // Fallback polling every 5s (SSE handles real-time; polling catches missed events)
    interval(5000)
      .pipe(switchMap(() => this.fetchBookingsFromServer()))
      .subscribe((bookings) => {
        if (!bookings) {
          return;
        }
        this.persist(this.mergeServerWithLocal(bookings));
      });
  }

  createBooking(userId: string, userName: string, request: BookingRequest): Booking {
    const sessionUser = this.auth.getCurrentUser();
    const normalizedUserId = sessionUser?.id || userId;
    const normalizedUserName = sessionUser?.displayName || userName;
    const now = new Date().toISOString();
    const scheduledAt = request.scheduledAt ? new Date(request.scheduledAt).toISOString() : undefined;
    const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const booking: Booking = {
      id: `RouteX-BK-${Date.now().toString().slice(-8)}`,
      userId: normalizedUserId,
      userName: normalizedUserName,
      bookingFor: request.bookingFor,
      recipientName: request.recipientName,
      recipientPhone: request.recipientPhone,
      isScheduled,
      scheduledAt,
      serviceType: request.serviceType,
      paymentMethod: request.paymentMethod,
      vehicleType: request.vehicleType,
      pickup: request.pickup,
      drop: request.drop,
      currentLocation: { ...request.pickup },
      status: 'created',
      otp,
      otpVerified: false,
      driverName: request.captainName || 'Ravi Kumar',
      driverPhone: request.captainPhone || '+91-90000-12345',
      captainId: request.captainId,
      notificationTarget: request.notificationTarget || 'all',  // default broadcast to ALL captains
      preferredCaptainId: request.preferredCaptainId,
      preferredCaptainName: request.preferredCaptainName,
      notification: isScheduled
        ? `Booking scheduled for ${new Date(scheduledAt as string).toLocaleString()}. OTP ${otp} will be used to start ride.`
        : request.serviceType === 'food'
          ? 'Your order is placed. Waiting for captain/restaurant acceptance.'
          : request.notificationTarget === 'all'
            ? `Booking confirmed. OTP ${otp} generated. Broadcast notification sent to all captains.`
            : `Booking confirmed. OTP ${otp} generated. Preferred captain will be notified.`,
      estimatedFare: request.estimatedFare,
      rideNotes: request.rideNotes,
      pickupServiceMode: request.pickupServiceMode,
      pickupShopName: request.pickupShopName,
      pickupShopPhone: request.pickupShopPhone,
      pickupItemDetails: request.pickupItemDetails,
      pickupShopInstructions: request.pickupShopInstructions,
      pickupItemGridSelection: request.pickupItemGridSelection,
      createdAt: now,
      updatedAt: now
    };

    const updated = [booking, ...this.bookingsSubject.value];
    this.persist(updated);

    // ── INSTANT cross-tab broadcast (captain on same browser gets it immediately, zero delay) ──
    this.broadcastChannel?.postMessage({ type: 'NEW_BOOKING', booking });

    // ── POST to server with auto-retry (up to 5 attempts, 3s apart) so captain on other devices gets it ──
    this.http
      .post<Booking>(BOOKINGS_API, request, { headers: this.getSessionHeaders() })
      .pipe(retry({ count: 5, delay: 3000 }))
      .subscribe({
        next: (serverBooking) => {
          this.upsertBooking(serverBooking);
          // Broadcast updated list after server confirms so all captain tabs refresh
          this.broadcastChannel?.postMessage({ type: 'BOOKINGS_UPDATED' });
        },
        error: () => {
          // After 5 retries still failed — silently ignore, local booking is safe
        }
      });

    if (isScheduled) {
      this.notifications.push(
        `Booking ${booking.id} scheduled for ${new Date(scheduledAt as string).toLocaleString()}.`,
        'info'
      );
    } else if (request.serviceType === 'food') {
      this.notifications.push(
        `Order ${booking.id} placed. Once captain/restaurant accepts, your order will be confirmed in about 2 minutes.`,
        'success'
      );
    } else {
      this.notifications.push(
        `Booking ${booking.id} created. OTP: ${booking.otp}. Enter this in tracking screen to start ride.`,
        'success'
      );
    }

    return booking;
  }

  verifyOtp(bookingId: string, otp: string): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found.' };
    }

    if (bookings[index].otp !== otp.trim()) {
      return { success: false, message: 'Invalid OTP.' };
    }

    bookings[index] = {
      ...bookings[index],
      otpVerified: true,
      status: 'assigned',
      notification: 'Ride started. Customer OTP verified successfully. Captain is on the way.',
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/verify-otp`, { otp }, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    this.notifications.push(`OTP verified for ${bookingId}. Ride started for customer.`, 'success');
    this.notifications.push('Customer notification: Your ride has started.', 'info');
    return { success: true, message: 'OTP verified. Ride started successfully.' };
  }

  approveByCaptain(bookingId: string): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found.' };
    }

    if (bookings[index].status !== 'created') {
      return { success: false, message: 'Captain approval is only available before ride start.' };
    }

    bookings[index] = {
      ...bookings[index],
      status: 'assigned',
      notification: 'Ride started. Captain approved the trip and is on the way.',
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/approve`, {}, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    this.notifications.push(`Captain approved ride start for ${bookingId}.`, 'success');
    return { success: true, message: 'Captain approved and ride started successfully.' };
  }

  cancelRide(bookingId: string, role: 'customer' | 'captain'): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found.' };
    }

    if (bookings[index].status === 'completed' || bookings[index].status === 'cancelled') {
      return { success: false, message: 'This ride can no longer be cancelled.' };
    }

    bookings[index] = {
      ...bookings[index],
      status: 'cancelled',
      notification: `Ride cancelled by ${role}.`,
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/cancel`, { role }, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    this.notifications.push(`Ride ${bookingId} cancelled by ${role}.`, 'warning');
    return { success: true, message: 'Ride cancelled successfully.' };
  }

  getBookingById$(bookingId: string): Observable<Booking | undefined> {
    return this.bookings$.pipe(map((bookings) => bookings.find((booking) => booking.id === bookingId)));
  }

  getBookingsForUser$(userId: string): Observable<Booking[]> {
    return this.bookings$.pipe(map((bookings) => bookings.filter((booking) => booking.userId === userId)));
  }

  getAllBookingsSnapshot(): Booking[] {
    return [...this.bookingsSubject.value];
  }

  buildRebookRequest(booking: Booking): BookingRequest {
    return {
      bookingFor: booking.bookingFor,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      serviceType: booking.serviceType,
      paymentMethod: booking.paymentMethod,
      vehicleType: booking.vehicleType,
      pickup: { ...booking.pickup },
      drop: { ...booking.drop },
      captainId: booking.captainId,
      captainName: booking.driverName,
      captainPhone: booking.driverPhone,
      notificationTarget: booking.notificationTarget,
      preferredCaptainId: booking.preferredCaptainId,
      preferredCaptainName: booking.preferredCaptainName,
      estimatedFare: booking.estimatedFare,
      rideNotes: booking.rideNotes,
      pickupServiceMode: booking.pickupServiceMode,
      pickupShopName: booking.pickupShopName,
      pickupShopPhone: booking.pickupShopPhone,
      pickupItemDetails: booking.pickupItemDetails,
      pickupShopInstructions: booking.pickupShopInstructions,
      pickupItemGridSelection: booking.pickupItemGridSelection
    };
  }

  triggerSos(bookingId: string, role: 'customer' | 'captain'): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found for SOS.' };
    }

    bookings[index] = {
      ...bookings[index],
      sosTriggered: true,
      sosByRole: role,
      notification: `SOS triggered by ${role}. Emergency support alerted and captain/customer informed.`,
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/sos`, { role }, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    this.notifications.push(`SOS alert sent for ${bookingId}.`, 'warning');
    return { success: true, message: 'SOS alert sent successfully.' };
  }

  submitRideFeedback(
    bookingId: string,
    payload: {
      rideRating: number;
      captainRating: number;
      feedbackText?: string;
      lovedRide: boolean;
      lovedCaptain: boolean;
    }
  ): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found for feedback.' };
    }

    if (bookings[index].status !== 'completed') {
      return { success: false, message: 'Feedback is available only after ride completion.' };
    }

    bookings[index] = {
      ...bookings[index],
      feedbackSubmitted: true,
      feedbackSubmittedAt: new Date().toISOString(),
      rideRating: payload.rideRating,
      captainRating: payload.captainRating,
      feedbackText: (payload.feedbackText || '').trim() || undefined,
      lovedRide: payload.lovedRide,
      lovedCaptain: payload.lovedCaptain,
      notification: 'Thank you! Customer feedback and ratings submitted successfully.',
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/feedback`, payload, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    this.notifications.push('Feedback submitted. Thanks for rating this ride and captain.', 'success');
    return { success: true, message: 'Feedback submitted successfully.' };
  }

  markPaymentDone(bookingId: string, amount: number): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found for payment.' };
    }

    if (bookings[index].status !== 'completed') {
      return { success: false, message: 'Payment can be completed only after ride completion.' };
    }

    const finalAmount = Number(amount || bookings[index].estimatedFare || 0);
    bookings[index] = {
      ...bookings[index],
      finalAmount,
      paymentDone: true,
      paymentDoneAt: new Date().toISOString(),
      notification: `Payment completed by customer: Rs ${finalAmount}. Captain has been notified. Please submit feedback to close tracking.`,
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/pay`, { amount: finalAmount }, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
    return { success: true, message: `Payment completed: Rs ${finalAmount}.` };
  }

  closeTracking(bookingId: string): { success: boolean; message: string } {
    const bookings = [...this.bookingsSubject.value];
    const index = bookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return { success: false, message: 'Booking not found for closing tracking.' };
    }

    if (!bookings[index].feedbackSubmitted) {
      return { success: false, message: 'Please submit feedback before closing tracking.' };
    }

    bookings[index] = {
      ...bookings[index],
      trackingClosed: true,
      trackingClosedAt: new Date().toISOString(),
      notification: 'Tracking closed. Trip moved to booking history.',
      updatedAt: new Date().toISOString()
    };

    this.persist(bookings);
    this.http
      .post<Booking>(`${BOOKINGS_API}/${bookingId}/close-tracking`, {}, { headers: this.getSessionHeaders() })
      .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });

    return { success: true, message: 'Tracking closed and moved to history.' };
  }

  private tickBookings(): void {
    const before = this.bookingsSubject.value;
    const changed = before.map((booking) => this.progressBooking(booking));
    this.persist(changed, false);

    // Sync any locally auto-cancelled bookings to the server so the server
    // does not restore them on the next poll and trigger the notification loop.
    changed.forEach((booking, index) => {
      const previous = before[index];
      if (booking.status === 'cancelled' && previous.status !== 'cancelled') {
        this.http
          .post<Booking>(`${BOOKINGS_API}/${booking.id}/cancel`, { role: 'system' }, { headers: this.getSessionHeaders() })
          .subscribe({ next: (serverBooking) => this.upsertBooking(serverBooking), error: () => void 0 });
      }
    });
  }

  private syncBookingsFromServer(forceNotify: boolean = false): void {
    this.fetchBookingsFromServer().subscribe((serverBookings) => {
      if (!serverBookings) {
        return;
      }

      this.persist(this.mergeServerWithLocal(serverBookings));
      if (forceNotify) {
        this.notifications.push('Live ride sync connected to backend.', 'info');
      }
    });
  }

  private fetchBookingsFromServer(): Observable<Booking[] | null> {
    const token = this.auth.getSessionToken();
    if (!token) {
      return of(null);
    }

    const includeCompleted = this.auth.isAdmin() || this.auth.getCurrentUser()?.role === 'customer';
    return this.http.get<Booking[]>(`${BOOKINGS_API}?includeCompleted=${includeCompleted}`, {
      headers: this.getSessionHeaders()
    }).pipe(
      map((items) => Array.isArray(items) ? items : []),
      catchError(() => of(null))
    );
  }

  private getSessionHeaders(): HttpHeaders {
    const token = this.auth.getSessionToken();
    return token ? new HttpHeaders({ 'x-session-token': token }) : new HttpHeaders();
  }

  private connectSse(): void {
    this.disconnectSse();
    const token = this.auth.getSessionToken();
    if (!token || typeof EventSource === 'undefined') return;
    const url = `${EVENTS_API}?sessionToken=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    this.eventSource = es;

    es.addEventListener('new_booking', (event: MessageEvent) => {
      try { this.upsertBooking(JSON.parse(event.data) as Booking); } catch { /* ignore */ }
    });

    es.addEventListener('booking_updated', (event: MessageEvent) => {
      try { this.upsertBooking(JSON.parse(event.data) as Booking); } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      this.eventSource = null;
      if (this.auth.getSessionToken()) {
        this.sseRetryTimer = setTimeout(() => this.connectSse(), 5000);
      }
    };
  }

  private disconnectSse(): void {
    if (this.sseRetryTimer) { clearTimeout(this.sseRetryTimer); this.sseRetryTimer = null; }
    if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }
  }

  private upsertBooking(serverBooking: Booking): void {
    const existing = [...this.bookingsSubject.value];
    const idx = existing.findIndex((item) => item.id === serverBooking.id);
    if (idx >= 0) {
      existing[idx] = serverBooking;
      this.persist(existing);
      return;
    }

    const localTempIdx = existing.findIndex((item) => this.isLikelyLocalTempMatch(item, serverBooking));
    if (localTempIdx >= 0) {
      existing[localTempIdx] = {
        ...existing[localTempIdx],
        ...serverBooking
      };
      this.persist(existing);
      return;
    }

    this.persist([serverBooking, ...existing]);
  }

  private mergeServerWithLocal(serverBookings: Booking[]): Booking[] {
    const local = this.bookingsSubject.value;
    const localById = new Map(local.map((item) => [item.id, item]));
    const serverIds = new Set(serverBookings.map((item) => item.id));

    // For bookings the server knows about, prefer the server version UNLESS the
    // local version has a terminal status (cancelled/completed) that is newer than
    // the server version — this prevents server-sync from undoing a local
    // auto-cancellation and causing the 20-min popup to fire on every tick.
    const merged = serverBookings.map((serverItem) => {
      const localItem = localById.get(serverItem.id);
      if (!localItem) {
        return serverItem;
      }

      const localIsTerminal = localItem.status === 'cancelled' || localItem.status === 'completed';
      const serverIsNonTerminal = serverItem.status !== 'cancelled' && serverItem.status !== 'completed';
      const localIsNewer = new Date(localItem.updatedAt).getTime() > new Date(serverItem.updatedAt).getTime();

      if (localIsTerminal && serverIsNonTerminal && localIsNewer) {
        return localItem;
      }

      return serverItem;
    });

    const keepLocal = local.filter((item) => {
      if (serverIds.has(item.id)) {
        return false;
      }

      const recentMinutes = this.minutesSince(item.updatedAt || item.createdAt);
      const active = item.status !== 'completed' && item.status !== 'cancelled';
      const localTempId = item.id.startsWith('RouteX-BK-') || item.id.startsWith('BK-');

      return localTempId && active && recentMinutes <= 30;
    });

    return [...merged, ...keepLocal].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private isLikelyLocalTempMatch(localBooking: Booking, serverBooking: Booking): boolean {
    if (!localBooking.id.startsWith('RouteX-BK-') && !localBooking.id.startsWith('BK-')) {
      return false;
    }

    const closeInTime = Math.abs(
      new Date(localBooking.createdAt).getTime() - new Date(serverBooking.createdAt).getTime()
    ) <= 10 * 60 * 1000;

    return closeInTime &&
      localBooking.userId === serverBooking.userId &&
      localBooking.serviceType === serverBooking.serviceType &&
      localBooking.vehicleType === serverBooking.vehicleType &&
      localBooking.pickup.address === serverBooking.pickup.address &&
      localBooking.drop.address === serverBooking.drop.address;
  }

  private minutesSince(isoTime?: string): number {
    if (!isoTime) {
      return Number.POSITIVE_INFINITY;
    }
    return (Date.now() - new Date(isoTime).getTime()) / 60000;
  }

  private progressBooking(booking: Booking): Booking {
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return booking;
    }

    if (booking.scheduledAt && new Date(booking.scheduledAt).getTime() > Date.now()) {
      return {
        ...booking,
        notification: `Scheduled booking. Ride will start after ${new Date(booking.scheduledAt).toLocaleString()}.`
      };
    }

    if (booking.serviceType === 'food' && booking.status === 'created') {
      if (this.minutesSince(booking.createdAt) >= BookingService.FOOD_CONFIRMATION_DELAY_MINUTES) {
        if (!this.notifiedBookingIds.has(`food-confirmed-${booking.id}`)) {
          this.notifiedBookingIds.add(`food-confirmed-${booking.id}`);
          this.notifications.push(`Order ${booking.id} confirmed by captain/restaurant.`, 'success');
        }
        return {
          ...booking,
          status: 'assigned',
          updatedAt: new Date().toISOString(),
          notification: 'Your order is confirmed by captain/restaurant.'
        };
      }

      return {
        ...booking,
        notification: 'Your order is placed. Waiting for captain/restaurant acceptance.'
      };
    }

    if (booking.status === 'created' && booking.serviceType !== 'food') {
      if (this.minutesSince(booking.createdAt) >= BookingService.CAPTAIN_ACCEPT_TIMEOUT_MINUTES) {
        if (!this.notifiedBookingIds.has(`auto-cancel-${booking.id}`)) {
          this.notifiedBookingIds.add(`auto-cancel-${booking.id}`);
          this.notifications.push(`Ride ${booking.id} was auto-cancelled because no captain accepted within 20 minutes.`, 'warning');
        }
        return {
          ...booking,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
          notification: 'Ride auto-cancelled. No captain accepted within 20 minutes.'
        };
      }
    }

    if (!booking.otpVerified && booking.status === 'created') {
      return {
        ...booking,
        notification: 'Waiting for customer OTP verification to start ride.'
      };
    }

    const sequence: BookingStatus[] = [
      'assigned',
      'pickup_in_progress',
      'in_transit',
      'arriving',
      'delivered',
      'completed'
    ];

    const currentIndex = sequence.indexOf(booking.status);
    let nextStatus: BookingStatus = booking.status;

    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      nextStatus = sequence[currentIndex + 1];
    }

    const movedLocation = this.interpolateLocation(booking.currentLocation, booking.drop, 0.22);

    return {
      ...booking,
      status: nextStatus,
      currentLocation: movedLocation,
      updatedAt: new Date().toISOString(),
      notification:
        nextStatus === 'delivered'
          ? 'Package delivered near drop point. Completing trip now.'
          : nextStatus === 'completed'
            ? 'Ride completed successfully. Thank you for riding with us.'
            : booking.notification
    };
  }

  private interpolateLocation(start: Booking['currentLocation'], end: Booking['drop'], factor: number) {
    const landmarkSeed = Math.abs(Math.round((start.lat + start.lng) * 1000)) % 5;
    const landmarks = ['Maha Laxmi Garden', 'City Metro Gate', 'Lake View Point', 'Market Junction', 'Tech Park Block'];
    const houseNumber = Math.abs(Math.round((start.lat * 10000 + start.lng * 10000) % 9000)) + 1000;

    return {
      lat: this.round(start.lat + (end.lat - start.lat) * factor),
      lng: this.round(start.lng + (end.lng - start.lng) * factor),
      address: `Near ${houseNumber} ${landmarks[landmarkSeed]}`
    };
  }

  private round(value: number): number {
    return Math.round(value * 100000) / 100000;
  }

  private persist(bookings: Booking[], notify: boolean = true): void {
    this.bookingsSubject.next(bookings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    // Notify other tabs (captain tab) instantly via BroadcastChannel
    this.broadcastChannel?.postMessage({ type: 'BOOKINGS_UPDATED' });

    if (notify) {
      return;
    }
  }

  private loadBookings(): Booking[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Booking[];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }
}
