import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export type GeoPoint = { lat: number; lng: number };

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class School extends Model {
  static table = 'schools';

  @text('name') name: string;
  @text('attendance_reference_time') attendanceReferenceTime: string; // "HH:mm"
  @field('attendance_tolerance_minutes') attendanceToleranceMinutes: number;
  @text('card_signing_public_key') cardSigningPublicKey?: string; // hex Ed25519
  @text('geofence_corners') geofenceCornersJson?: string;
  @text('scan_window_start') scanWindowStart?: string; // "HH:mm"
  @text('scan_window_end') scanWindowEnd?: string; // "HH:mm"

  /** Coins parsés, ou `null` si l'école n'a pas de périmètre configuré. */
  get geofenceCorners(): GeoPoint[] | null {
    if (!this.geofenceCornersJson) return null;
    try {
      return JSON.parse(this.geofenceCornersJson) as GeoPoint[];
    } catch {
      return null;
    }
  }
}
