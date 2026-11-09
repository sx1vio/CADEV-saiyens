import {
  EmailLoginRequest,
  EmailRegisterRequest,
  PasswordForgotRequest,
  PasswordResetRequest,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

export class EmailRegisterRequestDto extends createZodDto(EmailRegisterRequest) {}
export class EmailLoginRequestDto extends createZodDto(EmailLoginRequest) {}
export class PasswordForgotRequestDto extends createZodDto(PasswordForgotRequest) {}
export class PasswordResetRequestDto extends createZodDto(PasswordResetRequest) {}
