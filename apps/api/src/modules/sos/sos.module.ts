import { Module } from '@nestjs/common';
import { AiModule } from '../ai';
import { IdentityModule } from '../identity';
import { MatchingModule, MatchingPort } from '../matching';
import { NotificationsModule, Notifier } from '../notifications';
import { AwardXp, ReputationModule } from '../reputation';
import { Answers } from './application/answers';
import { AskQuestion } from './application/ask-question';
import { EditContent } from './application/edit-content';
import { AnswersController } from './http/answers.controller';
import { TagsController } from './http/tags.controller';
import { TranslationsController } from './http/translations.controller';
import { TagReferenceSync } from './infrastructure/tag-reference.sync';
import { QuestionsController } from './http/questions.controller';
import { SosActions } from './http/sos.actions';
import { QuestionReader } from './infrastructure/question.reader';

// Module sos : SOS Dev, questions et réponses (CDC v3 §6.1). Propriétaire : Florent.
@Module({
  imports: [IdentityModule, ReputationModule, NotificationsModule, MatchingModule, AiModule],
  controllers: [QuestionsController, AnswersController, TagsController, TranslationsController],
  providers: [
    QuestionReader,
    TagReferenceSync,
    SosActions,
    EditContent,
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
