import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { AskQuestion } from './application/ask-question';
import { QuestionsController } from './http/questions.controller';
import { QuestionReader } from './infrastructure/question.reader';

// Module sos : SOS Dev, questions et réponses (CDC v3 §6.1). Propriétaire : Florent.
@Module({
  imports: [IdentityModule],
  controllers: [QuestionsController],
  providers: [QuestionReader, { provide: AskQuestion, useFactory: () => new AskQuestion() }],
})
export class SosModule {}
