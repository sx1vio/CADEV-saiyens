import { CodeOfConductResponse, MeResponse, UpdateMeRequest } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

// Les schémas vivent dans @devhub/contracts (partagés avec le front) ; ici, seulement les DTO NestJS.
export { CodeOfConductResponse, MeResponse };
export class MeResponseDto extends createZodDto(MeResponse) {}
export class UpdateMeRequestDto extends createZodDto(UpdateMeRequest) {}
export class CodeOfConductResponseDto extends createZodDto(CodeOfConductResponse) {}
