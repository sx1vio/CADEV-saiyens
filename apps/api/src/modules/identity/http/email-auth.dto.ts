import { EmailLoginRequest, EmailRegisterRequest } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

export class EmailRegisterRequestDto extends createZodDto(EmailRegisterRequest) {}
export class EmailLoginRequestDto extends createZodDto(EmailLoginRequest) {}
