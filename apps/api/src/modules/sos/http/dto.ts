import {
  AskQuestionRequest,
  AskQuestionResponse,
  ListQuestionsQuery,
  ListQuestionsResponse,
  QuestionDetail,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

export { AskQuestionResponse, ListQuestionsResponse, QuestionDetail };
export class AskQuestionRequestDto extends createZodDto(AskQuestionRequest) {}
export class AskQuestionResponseDto extends createZodDto(AskQuestionResponse) {}
export class ListQuestionsQueryDto extends createZodDto(ListQuestionsQuery) {}
export class ListQuestionsResponseDto extends createZodDto(ListQuestionsResponse) {}
export class QuestionDetailDto extends createZodDto(QuestionDetail) {}
