const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  display_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['customer', 'admin', 'captain'] },
  captain_vehicle: { type: String, default: null },
  profile_image: { type: String, default: null },
  customer_otp_completed: { type: Number, default: 1 },
  created_at: { type: String, required: true }
}, { collection: 'users', versionKey: false });

const otpCodeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  user_id: { type: String, required: true },
  session_token: { type: String, required: true },
  channel: { type: String, required: true, enum: ['email', 'mobile'] },
  code: { type: String, required: true },
  consumed: { type: Number, default: 0 },
  expires_at: { type: String, required: true },
  created_at: { type: String, required: true }
}, { collection: 'otp_codes', versionKey: false });

const authSessionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  user_id: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['temp', 'session'] },
  mfa_verified: { type: Number, default: 0 },
  voice_verified: { type: Number, default: 0 },
  expires_at: { type: String, required: true },
  created_at: { type: String, required: true }
}, { collection: 'auth_sessions', versionKey: false });

const voiceChallengeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  session_token: { type: String, required: true },
  phrase: { type: String, required: true },
  consumed: { type: Number, default: 0 },
  expires_at: { type: String, required: true },
  created_at: { type: String, required: true }
}, { collection: 'voice_challenges', versionKey: false });

const userActionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  user_id: { type: String, required: true },
  action_type: { type: String, required: true },
  metadata_json: { type: String, default: '{}' },
  created_at: { type: String, required: true }
}, { collection: 'user_actions', versionKey: false });

const captainFeedbackSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  booking_id: { type: String, required: true, unique: true },
  captain_user_id: { type: String, default: null },
  captain_name: { type: String, required: true },
  submitted_by_user_id: { type: String, required: true },
  submitted_by_name: { type: String, required: true },
  ride_rating: { type: Number, required: true },
  captain_rating: { type: Number, required: true },
  feedback_text: { type: String, default: null },
  loved_ride: { type: Number, default: 0 },
  loved_captain: { type: Number, default: 0 },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
}, { collection: 'captain_feedback', versionKey: false });

const bookingSchema = new mongoose.Schema({
  _id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  booking_for: { type: String, required: true },
  recipient_name: { type: String, default: null },
  recipient_phone: { type: String, default: null },
  is_scheduled: { type: Number, default: 0 },
  scheduled_at: { type: String, default: null },
  service_type: { type: String, required: true },
  payment_method: { type: String, required: true },
  vehicle_type: { type: String, required: true },
  pickup_json: { type: String, required: true },
  drop_json: { type: String, required: true },
  current_location_json: { type: String, required: true },
  status: { type: String, required: true },
  otp: { type: String, required: true },
  otp_verified: { type: Number, default: 0 },
  driver_name: { type: String, required: true },
  driver_phone: { type: String, required: true },
  captain_id: { type: String, default: null },
  notification_target: { type: String, default: 'preferred' },
  preferred_captain_id: { type: String, default: null },
  preferred_captain_name: { type: String, default: null },
  notification: { type: String, required: true },
  estimated_fare: { type: Number, default: null },
  ride_notes: { type: String, default: null },
  sos_triggered: { type: Number, default: 0 },
  sos_by_role: { type: String, default: null },
  feedback_submitted: { type: Number, default: 0 },
  feedback_submitted_at: { type: String, default: null },
  feedback_text: { type: String, default: null },
  ride_rating: { type: Number, default: null },
  captain_rating: { type: Number, default: null },
  loved_ride: { type: Number, default: 0 },
  loved_captain: { type: Number, default: 0 },
  final_amount: { type: Number, default: null },
  payment_done: { type: Number, default: 0 },
  payment_done_at: { type: String, default: null },
  tracking_closed: { type: Number, default: 0 },
  tracking_closed_at: { type: String, default: null },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
}, { collection: 'bookings', versionKey: false });

const User = mongoose.model('User', userSchema);
const OtpCode = mongoose.model('OtpCode', otpCodeSchema);
const AuthSession = mongoose.model('AuthSession', authSessionSchema);
const VoiceChallenge = mongoose.model('VoiceChallenge', voiceChallengeSchema);
const UserAction = mongoose.model('UserAction', userActionSchema);
const CaptainFeedback = mongoose.model('CaptainFeedback', captainFeedbackSchema);
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { User, OtpCode, AuthSession, VoiceChallenge, UserAction, CaptainFeedback, Booking };
