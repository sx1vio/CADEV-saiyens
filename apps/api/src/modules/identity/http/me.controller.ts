import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { MeResponseDto, type MeResponse } from './me.dto';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from './session.guard';

@Controller('api/v1/me')
@UseGuards(SessionGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() auth: AuthenticatedUser): Promise<MeResponse> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    return {
      id: u.id,
      handle: u.handle,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email,
      emailVerified: u.emailVerified,
      bio: u.bio,
      country: u.country,
      timezone: u.timezone,
      languages: u.languages,
      uiLang: u.uiLang,
      lookingFor: u.lookingFor,
      githubLinked: u.githubId !== null,
      githubCreatedAt: u.githubCreatedAt?.toISOString() ?? null,
      codeOfConductAcceptedAt: u.cocAcceptedAt?.toISOString() ?? null,
      isAdmin: u.isAdmin,
      isDemo: u.isDemo,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
