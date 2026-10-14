import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { MatchingModule, MatchingPort } from '../matching';
import { NotificationsModule, Notifier } from '../notifications';
import { AwardXp, ReputationModule } from '../reputation';
import { Answers } from './application/answers';
import { AskQuestion } from './application/ask-question';
import { AnswersController } from './http/answers.controller';
import { QuestionsController } from './http/questions.controller';
import { QuestionReader } from './infrastructure/question.reader';

// Module sos : SOS Dev, questions et réponses (CDC v3 §6.1). Propriétaire : Florent.
@Module({
  imports: [IdentityModule, ReputationModule, NotificationsModule, MatchingModule],
  controllers: [QuestionsController, AnswersController],
  providers: [
    QuestionReader,
    { provide: AskQuestion, useFactory: () => new AskQuestion() },
    {
      provide: Answers,
      inject: [AwardXp, Notifier, MatchingPort],
      useFactory: (xp: AwardXp, notifier: Notifier, matching: MatchingPort) =>
        new Answers(xp, notifier, matching),
    },
  ],
})
export class SosModule {}
