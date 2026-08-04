import type { Prisma } from '@prisma/client';

type MinimalLogger = { warn: (message: string) => void };

// Modèles dont le champ `schoolId` est requis (non nullable) — périmètre
// volontairement restreint à ces 4 : les modèles à schoolId nullable (User,
// AuditLog) ou scopés indirectement via une relation (Absence,
// AttendanceRecord, StudentCard, ParentGuardian) demandent une règle
// différente et sont hors périmètre de ce garde-fou pour l'instant.
const TENANT_SCOPED_MODELS = new Set(['SchoolClass', 'Student', 'AttendanceSession', 'SchoolClosureDate']);

// findUnique/findUniqueOrThrow exclus : ciblent une ligne par sa clé unique
// (id) — la garantie d'isolation doit venir de la vérification
// d'appartenance faite en amont (cf. `assertBelongsToSchool`), pas de cette requête-là.
const GUARDED_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

export class MissingTenantScopeError extends Error {
  constructor(violation: string) {
    super(
      `Requête ${violation} sans filtre schoolId direct — isolation multi-écoles non garantie. ` +
        'Ajoute schoolId au `where`, ou passe par un chemin explicitement transverse si voulu.',
    );
    this.name = 'MissingTenantScopeError';
  }
}

/** Retourne "Model.action" si la requête devrait être scopée par école et ne l'est pas, sinon null. */
export function findTenantScopeViolation(model: string | undefined, action: string, where: unknown): string | null {
  if (!model || !TENANT_SCOPED_MODELS.has(model) || !GUARDED_ACTIONS.has(action)) return null;
  if (!where || typeof where !== 'object' || !('schoolId' in where)) {
    return `${model}.${action}`;
  }
  return null;
}

export function createTenantScopeMiddleware(
  options: { mode?: 'warn' | 'throw'; logger?: MinimalLogger } = {},
): Prisma.Middleware {
  const mode = options.mode ?? 'warn';
  const logger = options.logger ?? { warn: (message: string) => console.warn(message) };

  return async (params, next) => {
    const violation = findTenantScopeViolation(params.model, params.action, (params.args as { where?: unknown })?.where);
    if (violation) {
      if (mode === 'throw') throw new MissingTenantScopeError(violation);
      logger.warn(
        `[TenantScopeGuard] Requête ${violation} sans filtre schoolId direct — isolation multi-écoles non garantie par cette requête.`,
      );
    }
    return next(params);
  };
}
