import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PassportResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PassportReader } from '../infrastructure/passport.reader';

class PassportResponseDto extends createZodDto(PassportResponse) {}

@Controller('api/v1/u')
export class PassportController {
  constructor(private readonly reader: PassportReader) {}

  /** PR2 : Passport public /u/:handle, sans compte. Les preuves sont dans /u/:handle/proofs (PR3). */
  @Get(':handle')
  @ApiOkResponse({ type: PassportResponseDto })
  async passport(@Param('handle') handle: string): Promise<PassportResponse> {
    const passport = /^[A-Za-z0-9-]{1,40}$/.test(handle)
      ? await this.reader.byHandle(handle)
      : null;
    if (!passport) throw new NotFoundException({ code: 'not_found', title: 'Passport not found' });
    return passport;
  }
}
