import { ProofsQuery, ProofsResponse, XpRulesResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

export { ProofsResponse, XpRulesResponse };
export class ProofsQueryDto extends createZodDto(ProofsQuery) {}
export class ProofsResponseDto extends createZodDto(ProofsResponse) {}
export class XpRulesResponseDto extends createZodDto(XpRulesResponse) {}
