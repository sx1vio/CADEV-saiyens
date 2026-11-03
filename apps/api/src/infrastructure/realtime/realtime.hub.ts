import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { Client } from 'pg';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { PUBLIC_CHANNEL, USER_CHANNEL } from './realtime.publisher';

/** Une connexion SSE ouverte (un onglet). */
export interface Subscriber {
  userId: string | null;
  topics: Set<string>;
  /** Nouvelles notifications possibles pour cet utilisateur : relire depuis le dernier seq envoyé. */
  onUserEvent(): void;
  onPublicEvent(event: string, data: Record<string, string>): void;
  /** Signal personnel sans notification (ex. « dm » : un message privé est arrivé). */
  onUserSignal?(kind: string): void;
}

const RECONNECT_MS = 2_000;

/**
 * Registre des connexions SSE et **unique** connexion LISTEN par process API (07 § temps réel).
 * Plusieurs instances : chacune a son LISTEN, et NOTIFY diffuse à toutes.
 */
@Injectable()
export class RealtimeHub implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeHub.name);
  private readonly subscribers = new Set<Subscriber>();
  private client: Client | null = null;
  private stopping = false;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async onModuleInit(): Promise<void> {
    // Le worker publie (pg_notify) mais n'écoute pas : il n'a pas de connexion SSE.
    if (this.env.PROCESS_ROLE !== 'http') return;
    await this.listen();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    await this.client?.end().catch(() => undefined);
  }

  add(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  get size(): number {
    return this.subscribers.size;
  }

  /** Distribution d'un message reçu (exposée pour les tests). */
  dispatch(channel: string, payload: string | undefined): void {
    let message: { u?: string; s?: string; t?: string; e?: string; d?: Record<string, string> };
    try {
      message = JSON.parse(payload ?? '{}');
    } catch {
      return;
    }
    for (const s of this.subscribers) {
      if (channel === USER_CHANNEL && message.u && s.userId === message.u) {
        if (message.s) s.onUserSignal?.(message.s);
        else s.onUserEvent();
      }
      if (channel === PUBLIC_CHANNEL && message.t && message.e && s.topics.has(message.t)) {
        s.onPublicEvent(message.e, message.d ?? {});
      }
    }
  }

  private async listen(): Promise<void> {
    const client = new Client({ connectionString: this.env.DATABASE_URL });
    client.on('notification', (n) => this.dispatch(n.channel, n.payload));
    client.on('error', (err) => {
      this.logger.error({ err }, 'Connexion LISTEN perdue');
      void this.reconnect();
    });
    await client.connect();
    await client.query(`LISTEN ${USER_CHANNEL}`);
    await client.query(`LISTEN ${PUBLIC_CHANNEL}`);
    this.client = client;
  }

  private async reconnect(): Promise<void> {
    if (this.stopping) return;
    await this.client?.end().catch(() => undefined);
    this.client = null;
    setTimeout(() => {
      // Après reconnexion, chaque abonné relit ce qu'il a manqué (seq), rien n'est perdu.
      this.listen()
        .then(() => {
          for (const s of this.subscribers) s.onUserEvent();
        })
        .catch(() => void this.reconnect());
    }, RECONNECT_MS);
  }
}
