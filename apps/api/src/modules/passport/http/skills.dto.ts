import { MySkillsResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';

export { MySkillsResponse };
export class MySkillsResponseDto extends createZodDto(MySkillsResponse) {}
