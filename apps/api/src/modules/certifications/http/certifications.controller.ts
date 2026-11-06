import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  CertAttemptResult,
  CertAttemptView,
  CertCheckRequest,
  CertCheckResponse,
  CertPracticeQuery,
  CertPracticeResponse,
  MyCertificationsResponse,
  StartCertAttemptRequest,
  SubmitCertAttemptRequest,
  UserCertificatesResponse,
  VerifyCertificateResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { CertError, CertificationsService } from '../infrastructure/certifications.service';

class StartCertAttemptRequestDto extends createZodDto(StartCertAttemptRequest) {}
class SubmitCertAttemptRequestDto extends createZodDto(SubmitCertAttemptRequest) {}
class CertPracticeQueryDto extends createZodDto(CertPracticeQuery) {}
class CertCheckRequestDto extends createZodDto(CertCheckRequest) {}
class CertAttemptViewDto extends createZodDto(CertAttemptView) {}
class CertAttemptResultDto extends createZodDto(CertAttemptResult) {}
class MyCertificationsResponseDto extends createZodDto(MyCertificationsResponse) {}
class CertPracticeResponseDto extends createZodDto(CertPracticeResponse) {}
class CertCheckResponseDto extends createZodDto(CertCheckResponse) {}
class UserCertificatesResponseDto extends createZodDto(UserCertificatesResponse) {}
class VerifyCertificateResponseDto extends createZodDto(VerifyCertificateResponse) {}

const notFound = (title = 'Not found') => new NotFoundException({ code: 'not_found', title });

function toHttp(e: unknown): never {
  if (!(e instanceof CertError)) throw e;
  switch (e.code) {
    case 'cert.retry_later':
      throw new HttpException(
        {
          code: e.code,
          title: 'Next exam attempt not yet available',
          nextAttemptAt: e.nextAttemptAt?.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    case 'cert.mock_limit':
      throw new HttpException(
        { code: e.code, title: 'Daily mock exam limit reached' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    case 'cert.already_submitted':
      throw new HttpException(
        { code: e.code, title: 'Attempt already submitted' },
        HttpStatus.CONFLICT,
      );
    default:
      throw notFound(e.code);
  }
}

// Certifications DevHub : entraînement public ; examen, examen blanc et certificats avec un compte.
@Controller('api/v1')
export class CertificationsController {
  constructor(private readonly certs: CertificationsService) {}

  @Get('certifications/me')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: MyCertificationsResponseDto })
  mine(@CurrentUser() auth: AuthenticatedUser): Promise<MyCertificationsResponse> {
    return this.certs.mine(auth.userId);
  }

  @Get('certifications/verify/:code')
  @ApiOkResponse({ type: VerifyCertificateResponseDto })
  async verify(@Param('code') code: string): Promise<VerifyCertificateResponse> {
    if (!/^DH-[A-Za-z0-9]{1,4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(code))
      throw notFound('Certificate not found');
    const found = await this.certs.verify(code);
    if (!found) throw notFound('Certificate not found');
    return found;
  }

  @Get('certifications/:certId/practice')
  @ApiOkResponse({ type: CertPracticeResponseDto })
  practice(
    @Param('certId') certId: string,
    @Query() q: CertPracticeQueryDto,
  ): CertPracticeResponse {
    try {
      return { questions: this.certs.practice(certId, q) };
    } catch (e) {
      toHttp(e);
    }
  }

  @Post('certifications/:certId/check')
  @HttpCode(200)
  @ApiOkResponse({ type: CertCheckResponseDto })
  check(@Param('certId') certId: string, @Body() body: CertCheckRequestDto): CertCheckResponse {
    try {
      return this.certs.check(certId, body.id, body.choice);
    } catch (e) {
      toHttp(e);
    }
  }

  @Post('certifications/:certId/attempts')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: CertAttemptViewDto })
  start(
    @Param('certId') certId: string,
    @Body() body: StartCertAttemptRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<CertAttemptView> {
    return this.certs.start(auth.userId, certId, body.mode).catch(toHttp);
  }

  @Post('certifications/attempts/:id/submit')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: CertAttemptResultDto })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitCertAttemptRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<CertAttemptResult> {
    const result = await this.certs.submit(auth.userId, id, body.answers).catch(toHttp);
    if (!result) throw notFound('Attempt not found');
    return result;
  }

  @Get('u/:handle/certificates')
  @ApiOkResponse({ type: UserCertificatesResponseDto })
  async ofUser(@Param('handle') handle: string): Promise<UserCertificatesResponse> {
    const items = await this.certs.ofUser(handle);
    if (!items) throw notFound('User not found');
    return { items };
  }
}
