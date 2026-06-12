export type UserRole = 'customer' | 'admin' | 'captain' | 'user';
export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  email?: string;
  mobile?: string;
  captainVehicle?: VehicleType;
  profileImageUrl?: string;
  kycStatus?: KycStatus;
  kycDocumentType?: string;
  kycReferenceId?: string;
  kycUpdatedAt?: string;
}

export interface LoginStartResponse {
  requiresOtp: boolean;
  tempToken: string;
  message: string;
  sessionToken?: string;
  user?: AppUser;
  channels: {
    email: string;
    mobile?: string;
  };
  devOtps?: {
    emailOtp: string;
    mobileOtp?: string;
  };
}

export interface RegisterRequest {
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  password: string;
  role: Exclude<UserRole, 'user'>;
  captainVehicle?: VehicleType;
  profileImageUrl?: string;
}

export interface RegisterResponse {
  message: string;
  requiresOtp?: boolean;
  tempToken?: string;
  channels?: {
    email: string;
    mobile?: string;
  };
  devOtps?: {
    emailOtp: string;
    mobileOtp?: string;
  };
}

export interface VerifyOtpResponse {
  sessionToken: string;
  user: AppUser;
  message: string;
}

export interface VoiceChallengeResponse {
  phrase: string;
  expiresAt: string;
}

export interface UserActionLog {
  actionType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string;
}

export interface CaptainFeedbackRequest {
  bookingId: string;
  captainId?: string;
  captainName: string;
  rideRating: number;
  captainRating: number;
  feedbackText?: string;
  lovedRide: boolean;
  lovedCaptain: boolean;
}

export interface CaptainFeedbackComment {
  bookingId: string;
  userName: string;
  rideRating: number;
  captainRating: number;
  feedbackText: string;
  lovedRide: boolean;
  lovedCaptain: boolean;
  createdAt: string;
}

export interface CaptainFeedbackStats {
  avgCaptainRating: number;
  avgRideRating: number;
  totalHearts: number;
  feedbackCount: number;
  recentComments: CaptainFeedbackComment[];
}

export interface DynamicOffer {
  id: string;
  title: string;
  subtitle: string;
  discountPercent: number;
  promoCode: string;
  badge: string;
  expiresAt: string;
}

export interface DynamicNewsItem {
  id: string;
  title: string;
  summary: string;
  tag: 'service' | 'safety' | 'feature' | 'delivery' | 'offer';
  publishedAt: string;
}

export interface DynamicOfferFeed {
  updatedAt: string;
  offers: DynamicOffer[];
  news: DynamicNewsItem[];
}

export type ServiceType = 'food' | 'parcel' | 'grocery' | 'medicine' | 'documents';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';
export type VehicleType = 'bike' | 'auto' | 'car' | 'scooter' | 'van' | 'truck';

export interface NearbyCaptain {
  id: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleLabel: string;
  rating: number;
  etaMinutes: number;
  distanceKm: number;
  availability: 'available' | 'busy' | 'arriving';
  kycStatus?: KycStatus;
  kycReferenceId?: string;
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface CaptainDirectoryItem {
  id: string;
  username: string;
  displayName: string;
  phone: string;
  vehicleType: VehicleType;
  profileImageUrl?: string;
  rating: number;
  availability: 'available' | 'busy' | 'arriving';
  createdAt: string;
  kycStatus?: KycStatus;
  kycReferenceId?: string;
}

export interface UserStats {
  totalUsers: number;
  totalCustomers: number;
  totalCaptains: number;
  totalAdmins: number;
  source: 'mongodb' | string;
}

export interface AdminUserListItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  role: Exclude<UserRole, 'user'>;
  captainVehicle?: VehicleType;
  customerOtpCompleted: boolean;
  createdAt: string;
}

export type BookingStatus =
  | 'created'
  | 'assigned'
  | 'pickup_in_progress'
  | 'in_transit'
  | 'arriving'
  | 'delivered'
  | 'cancelled'
  | 'completed';

export interface GeoPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  bookingFor: 'self' | 'others';
  recipientName?: string;
  recipientPhone?: string;
  isScheduled?: boolean;
  scheduledAt?: string;
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
  vehicleType: VehicleType;
  pickup: GeoPoint;
  drop: GeoPoint;
  currentLocation: GeoPoint;
  status: BookingStatus;
  otp: string;
  otpVerified: boolean;
  driverName: string;
  driverPhone: string;
  captainId?: string;
  notificationTarget?: 'all' | 'preferred';
  preferredCaptainId?: string;
  preferredCaptainName?: string;
  notification: string;
  estimatedFare?: number;
  rideNotes?: string;
  pickupServiceMode?: boolean;
  pickupShopName?: string;
  pickupShopPhone?: string;
  pickupItemDetails?: string;
  pickupShopInstructions?: string;
  pickupItemGridSelection?: string[];
  sosTriggered?: boolean;
  sosByRole?: 'customer' | 'captain';
  feedbackSubmitted?: boolean;
  feedbackSubmittedAt?: string;
  feedbackText?: string;
  rideRating?: number;
  captainRating?: number;
  lovedRide?: boolean;
  lovedCaptain?: boolean;
  finalAmount?: number;
  paymentDone?: boolean;
  paymentDoneAt?: string;
  trackingClosed?: boolean;
  trackingClosedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  clientRequestId?: string;
  bookingFor: 'self' | 'others';
  recipientName?: string;
  recipientPhone?: string;
  scheduledAt?: string;
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
  vehicleType: VehicleType;
  pickup: GeoPoint;
  drop: GeoPoint;
  captainId?: string;
  captainName?: string;
  captainPhone?: string;
  notificationTarget?: 'all' | 'preferred';
  preferredCaptainId?: string;
  preferredCaptainName?: string;
  estimatedFare?: number;
  rideNotes?: string;
  pickupServiceMode?: boolean;
  pickupShopName?: string;
  pickupShopPhone?: string;
  pickupItemDetails?: string;
  pickupShopInstructions?: string;
  pickupItemGridSelection?: string[];
}

export interface AppNotification {
  id: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read?: boolean;
}

export interface LiveFareRequest {
  pickup: GeoPoint;
  drop: GeoPoint;
  vehicleType: VehicleType;
}

export interface LiveFareResponse {
  distanceKm: number;
  durationInTrafficMinutes: number;
  trafficCondition: 'low' | 'medium' | 'high';
  weatherCondition: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  weatherSummary: string;
  weatherTempC?: number;
  source: {
    googleTraffic: boolean;
    openWeather: boolean;
  };
  breakdown: {
    baseFare: number;
    distanceFare: number;
    vehicleMultiplier: number;
    trafficMultiplier: number;
    weatherMultiplier: number;
    total: number;
  };
  suggestedMessage: string;
}

export type IntegrationStatusColor = 'green' | 'red';

export interface IntegrationHealthItem {
  key: string;
  name: string;
  statusColor: IntegrationStatusColor;
  healthy: boolean;
  details: string;
  configured?: boolean;
  checkedAt: string;
}

export interface IntegrationHealthResponse {
  service: string;
  status: 'ok' | 'degraded';
  checkedAt: string;
  integrations: IntegrationHealthItem[];
}
