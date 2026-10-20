import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  AiRequestRecord,
  ModelCallBase,
  ModelCallResult,
  StoredTranslation,
  TranslatableType,
  TranslatedText,
  TranslationSource,
  TranslationStore,
} from '../domain/ports';
import {
  finishModelCall,
  recordAiRequest,
  releaseModelCall,
  reserveModelCall,
} from './ai-requests';

/** translations.text contient { title, body } en JSON : une seule ligne par contenu et par langue. */
const encode = (text: TranslatedText) => JSON.stringify({ title: text.title, body: text.body });

function decode(text: string): TranslatedText | null {
  try {
    const value = JSON.parse(text) as { title?: unknown; body?: unknown };
    if (typeof value.body !== 'string') return null;
    return { title: typeof value.title === 'string' ? value.title : null, body: value.body };
  } catch {
    return null;
  }
}

@Injectable()
export class PrismaTranslationStore implements TranslationStore {
  constructor(private readonly prisma: PrismaService) {}

  async findSource(type: TranslatableType, id: string): Promise<TranslationSource | null> {
    // Un contenu retiré par la modération (ou dont la question l'est) ne part pas à l'IA.
    if (type === 'question') {
      const q = await this.prisma.question.findFirst({
        where: { id, hiddenAt: null },
        select: { title: true, body: true, lang: true },
      });
      return q ? { type, id, title: q.title, body: q.body, lang: q.lang } : null;
    }
    const a = await this.prisma.answer.findFirst({
      where: { id, hiddenAt: null, question: { hiddenAt: null } },
      select: { body: true },
    });
    // La langue d'une réponse n'est pas déclarée : le modèle garde tel quel un texte déjà traduit.
    return a ? { type, id, title: null, body: a.body, lang: null } : null;
  }

  async findTranslation(
    type: TranslatableType,
    id: string,
    lang: 'fr' | 'en',
  ): Promise<StoredTranslation | null> {
    const row = await this.prisma.translation.findUnique({
      where: { contentType_contentId_lang: { contentType: type, contentId: id, lang } },
    });
    const text = row ? decode(row.text) : null;
    return row && text ? { ...text, sourceHash: row.sourceHash, createdAt: row.createdAt } : null;
  }

  async saveTranslation(
    type: TranslatableType,
    id: string,
    lang: 'fr' | 'en',
    sourceHash: string,
    text: TranslatedText,
  ): Promise<Date> {
    const createdAt = new Date();
    await this.prisma.translation.upsert({
      where: { contentType_contentId_lang: { contentType: type, contentId: id, lang } },
      create: { contentType: type, contentId: id, lang, sourceHash, text: encode(text), createdAt },
      update: { sourceHash, text: encode(text), createdAt },
    });
    return createdAt;
  }

  async findCachedTranslation(
    inputHash: string,
    promptVer: string,
  ): Promise<TranslatedText | null> {
    const row = await this.prisma.aiRequest.findFirst({
      where: { kind: 'translate', inputHash, promptVer, status: 'ok' },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    });
    return row?.output ? decode(JSON.stringify(row.output)) : null;
  }

  recordRequest(record: AiRequestRecord): Promise<void> {
    return recordAiRequest(this.prisma, record);
  }

  reserveModelCall(base: ModelCallBase, since: Date, quota: number): Promise<string | null> {
    return reserveModelCall(this.prisma, base, since, quota);
  }

  finishModelCall(id: string, result: ModelCallResult): Promise<void> {
    return finishModelCall(this.prisma, id, result);
  }

  releaseModelCall(id: string): Promise<void> {
    return releaseModelCall(this.prisma, id);
  }
}
