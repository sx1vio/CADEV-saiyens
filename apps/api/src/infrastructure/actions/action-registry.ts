import { Global, Injectable, Module } from '@nestjs/common';
import type { ActionType } from '@devhub/contracts';
import type { ZodType } from 'zod';
import type {
  IdempotencyService,
  IdempotentOutcome,
  Tx,
  WriteResult,
} from '../idempotency/idempotency.service';

/** Champ d'identifiant qui peut valoir « client:<uuid> » dans un lot hors ligne. */
export interface ClientRef {
  field: string;
  /** Table où chercher l'entité créée hors ligne par le même utilisateur. */
  kind: 'question' | 'answer';
}

/**
 * Une écriture de l'API, appelable par son endpoint HTTP **et** par POST /sync. Les deux
 * chemins utilisent la même route et le même corps : même empreinte d'idempotence, donc une
 * action envoyée seule puis rejouée dans un lot est reconnue comme un doublon (ADR-0008).
 */
export interface ActionDefinition<P = Record<string, unknown>> {
  /** Type d'action ; ceux de `ActionType` sont acceptés par POST /sync. */
  type: ActionType | `${string}.${string}`;
  /** Schéma du payload de /sync (identifiants compris). */
  schema: ZodType<P>;
  refs?: ClientRef[];
  /** Route canonique, ex. « POST /questions/<id>/answers ». */
  endpoint(payload: P): string;
  /** Corps HTTP équivalent, base de l'empreinte d'idempotence. */
  body(payload: P): unknown;
  execute(tx: Tx, userId: string, payload: P): Promise<WriteResult<unknown>>;
}

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<string, ActionDefinition>();

  /** Rend l'action disponible dans POST /sync. */
  register<P>(definition: ActionDefinition<P>): void {
    this.actions.set(definition.type, definition as unknown as ActionDefinition);
  }

  get(type: ActionType): ActionDefinition | undefined {
    return this.actions.get(type);
  }
}

@Global()
@Module({ providers: [ActionRegistry], exports: [ActionRegistry] })
export class ActionsModule {}

/** Exécute une action sous idempotence, comme le fera POST /sync pour la même action. */
export function runAction<P>(
  idempotency: IdempotencyService,
  action: ActionDefinition<P>,
  userId: string,
  key: string,
  payload: P,
): Promise<IdempotentOutcome<unknown>> {
  return idempotency.run(
    { userId, key, endpoint: action.endpoint(payload), body: action.body(payload) },
    (tx) => action.execute(tx, userId, payload),
  );
}
