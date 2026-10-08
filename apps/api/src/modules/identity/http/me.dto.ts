import { CodeOfConductResponse, MeResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

// Les schémas vivent dans @devhub/contracts (partagés avec le front) ; ici, seulement les DTO NestJS.
export { CodeOfConductResponse, MeResponse };
export class MeResponseDto extends createZodDto(MeResponse) {}
export class CodeOfConductResponseDto extends createZodDto(CodeOfConductResponse) {}
