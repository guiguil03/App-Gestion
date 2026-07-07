import { Injectable } from '@nestjs/common';

@Injectable()
export class LateDetectionService {
  /**
   * Un pointage est en retard s'il intervient après l'heure de référence de
   * l'école plus sa tolérance configurable, évalué le même jour calendaire
   * que le pointage (donc correct quel que soit le fuseau/date du serveur).
   */
  isLate(referenceTime: string, toleranceMinutes: number, recordedAt: Date): boolean {
    const [hours, minutes] = referenceTime.split(':').map(Number);
    const deadline = new Date(recordedAt);
    deadline.setHours(hours, minutes + toleranceMinutes, 0, 0);
    return recordedAt.getTime() > deadline.getTime();
  }
}
