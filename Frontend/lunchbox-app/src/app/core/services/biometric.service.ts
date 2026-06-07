import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface BiometricAvailability {
  available: boolean;
  platform: 'webauthn' | 'fingerprint' | 'none';
  reason?: string;
}

export interface BiometricRegistrationResult {
  success: boolean;
  message: string;
  credentialId?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  message: string;
  authenticatorData?: string;
}

@Injectable({ providedIn: 'root' })
export class BiometricService {
  constructor() {}

  /**
   * Check if biometric (fingerprint/thumbprint) authentication is available on this device
   */
  checkAvailability(): Observable<BiometricAvailability> {
    // Check WebAuthn (Web Authentication API)
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      return from(
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
      ).pipe(
        map((available) => {
          const result: BiometricAvailability = {
            available: false,
            platform: 'none',
            reason: 'No biometric hardware detected on this device'
          };

          if (available) {
            result.available = true;
            result.platform = 'webauthn';
            result.reason = 'WebAuthn/FIDO2 biometric authentication is available';
          }

          return result;
        }),
        catchError(() => {
          return of({
            available: false,
            platform: 'none' as const,
            reason: 'Biometric authentication check failed'
          });
        })
      );
    }

    return of({
      available: false,
      platform: 'none' as const,
      reason: 'WebAuthn not supported on this browser'
    });
  }

  /**
   * Register biometric credential for the user (thumbprint/fingerprint enrollment)
   */
  registerBiometric(userId: string, username: string): Observable<BiometricRegistrationResult> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return throwError(() => new Error('WebAuthn not available'));
    }

    const challenge = this.generateChallenge();
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as unknown as BufferSource,
      rp: { name: 'RouteX' },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    return from(
      navigator.credentials.create({ publicKey: publicKeyOptions }) as Promise<
        PublicKeyCredential | null
      >
    ).pipe(
      map((credential) => {
        if (!credential) {
          return { success: false, message: 'Biometric registration cancelled' };
        }

        const credentialId = this.bufferToBase64(credential.id as unknown as ArrayBuffer);
        localStorage.setItem(`biometric_${userId}`, credentialId);

        return {
          success: true,
          message: 'Thumbprint enrolled successfully. You can now use biometric login.',
          credentialId
        };
      }),
      catchError((error) => {
        console.error('Biometric registration error:', error);
        return of({
          success: false,
          message: `Biometric enrollment failed: ${error?.message || 'Unknown error'}`
        });
      })
    );
  }

  /**
   * Authenticate user with biometric (thumbprint/fingerprint)
   */
  authenticateWithBiometric(userId: string): Observable<BiometricAuthResult> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return throwError(() => new Error('WebAuthn not available'));
    }

    const storedCredentialId = localStorage.getItem(`biometric_${userId}`);
    if (!storedCredentialId) {
      return of({
        success: false,
        message: 'No biometric credential found for this user. Please register first.'
      });
    }

    const challenge = this.generateChallenge();
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge as unknown as BufferSource,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: [
        {
          type: 'public-key',
          id: this.base64ToBuffer(storedCredentialId) as unknown as BufferSource,
          transports: ['internal']
        }
      ]
    };

    return from(
      navigator.credentials.get({ publicKey: publicKeyOptions }) as Promise<
        PublicKeyCredential | null
      >
    ).pipe(
      map((credential) => {
        if (!credential) {
          return { success: false, message: 'Biometric authentication cancelled' };
        }

        return {
          success: true,
          message: 'Thumbprint verified successfully.',
          authenticatorData: this.bufferToBase64(
            (credential.response as AuthenticatorAssertionResponse)?.authenticatorData
          )
        };
      }),
      catchError((error) => {
        console.error('Biometric authentication error:', error);
        return of({
          success: false,
          message: `Biometric authentication failed: ${error?.message || 'Unknown error'}`
        });
      })
    );
  }

  private generateChallenge(): Uint8Array {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    }
    return array;
  }

  private bufferToBase64(buffer: ArrayBuffer | ArrayLike<number>): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
