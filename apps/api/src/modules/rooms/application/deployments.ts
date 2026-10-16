import { DEPLOYMENT_PROOF_PATH } from '@devhub/contracts';
import {
  DeploymentNotFoundError,
  DeploymentUnreachableError,
  ProofNotFoundError,
  deploymentToken,
  onSystalink,
  sameOrigin,
  servesToken,
} from '../domain/deployment';
import type {
  DeploymentProbe,
  DeploymentReputationPort,
  DeploymentState,
  DeploymentUnitOfWork,
  ProbeResponse,
} from '../domain/ports';
import { NotRoomManagerError, RoomNotFoundError, canManage } from '../domain/room';

export interface VerifyOutcome {
  hostedOnSystalink: boolean;
  /** Proof XP accordées à cette vérification (0 si déjà gagnées, ou hors Systalink). */
  xpAwarded: boolean;
}

/**
 * Idée A (partenariat Systalink) : prouver qu'une salle est en production. L'appel réseau se
 * fait hors transaction ; seules l'écriture et les Proof XP passent dans la transaction.
 */
export class Deployments {
  constructor(
    private readonly uow: DeploymentUnitOfWork,
    private readonly probe: DeploymentProbe,
    private readonly reputation: DeploymentReputationPort,
    private readonly systalinkRanges: string[],
    private readonly randomBytes: (n: number) => Uint8Array,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Créateur ou mainteneur : indique l'URL. Une autre origine reçoit un nouveau jeton. */
  set(input: { roomId: string; actorId: string; url: string }): Promise<DeploymentState> {
    return this.uow.run(async (store) => {
      const room = await store.findRoom(input.roomId);
      if (!room || room.hidden) throw new RoomNotFoundError();
      if (!canManage(await store.roleOf(room.id, input.actorId))) throw new NotRoomManagerError();
      const current = await store.find(room.id);
      const reset = !current || !sameOrigin(current.url, input.url);
      const token = reset ? deploymentToken(this.randomBytes) : current.token;
      await store.save({ roomId: room.id, url: input.url, token, reset });
      return (await store.find(room.id))!;
    });
  }

  /** Lit le jeton à l'URL, puis enregistre la vérification et les Proof XP. */
  async verify(input: { roomId: string; actorId: string }): Promise<VerifyOutcome> {
    const { deployment } = await this.uow.run(async (store) => {
      const room = await store.findRoom(input.roomId);
      if (!room || room.hidden) throw new RoomNotFoundError();
      if (!canManage(await store.roleOf(room.id, input.actorId))) throw new NotRoomManagerError();
      const deployment = await store.find(room.id);
      if (!deployment) throw new DeploymentNotFoundError();
      return { deployment };
    });

    const proof = await this.readProof(deployment);
    const hostedOnSystalink = onSystalink(proof.ips, this.systalinkRanges);

    return this.uow.run(async (store, tx) => {
      const room = await store.findRoom(input.roomId);
      const current = await store.find(input.roomId);
      // L'URL a changé pendant la vérification : on ne valide pas l'ancienne.
      if (!room || !current || current.token !== deployment.token) {
        throw new DeploymentNotFoundError();
      }
      await store.markVerified(room.id, {
        at: this.now(),
        hostedOnSystalink,
        hostIp: proof.ips[0] ?? null,
      });
      let xpAwarded = false;
      if (hostedOnSystalink) {
        const result = await this.reputation.deploymentVerified(
          { roomId: room.id, ownerId: room.ownerId, tagIds: room.stackTagIds },
          tx,
        );
        xpAwarded = result.events.length > 0;
      }
      return { hostedOnSystalink, xpAwarded };
    });
  }

  /** Worker : sonde chaque application vérifiée (disponibilité, hébergement). */
  async checkAll(): Promise<{ checked: number; up: number }> {
    const list = await this.uow.run((store) => store.listVerified());
    let up = 0;
    for (const d of list) {
      const at = this.now();
      let res: ProbeResponse | null = null;
      try {
        res = await this.probe.fetch(d.url);
      } catch (err) {
        if (!(err instanceof DeploymentUnreachableError)) throw err;
      }
      const ok = !!res && res.status < 500;
      if (ok) up++;
      await this.uow.run((store) =>
        store.recordCheck(d.roomId, {
          at,
          up: ok,
          latencyMs: res?.latencyMs ?? null,
          hostedOnSystalink: res ? onSystalink(res.ips, this.systalinkRanges) : false,
          hostIp: res?.ips[0] ?? null,
        }),
      );
    }
    return { checked: list.length, up };
  }

  /** Fichier /.well-known/devhub-proof.txt d'abord, puis balise meta de l'URL donnée. */
  private async readProof(d: DeploymentState): Promise<ProbeResponse> {
    const file = new URL(DEPLOYMENT_PROOF_PATH, d.url).toString();
    const attempts = [file, d.url];
    let reached = false;
    for (const url of attempts) {
      try {
        const res = await this.probe.fetch(url);
        reached = true;
        if (res.status < 400 && servesToken(res.body, d.token)) return res;
      } catch (err) {
        if (!(err instanceof DeploymentUnreachableError)) throw err;
      }
    }
    throw reached ? new ProofNotFoundError() : new DeploymentUnreachableError();
  }
}
