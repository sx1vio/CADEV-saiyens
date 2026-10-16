import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  DEPLOYMENT_PROOF_PATH,
  DeploymentChallenge,
  SetDeploymentRequest,
  VerifyDeploymentResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { Deployments } from '../application/deployments';
import {
  DeploymentNotFoundError,
  DeploymentUnreachableError,
  ProofNotFoundError,
} from '../domain/deployment';
import { canManage } from '../domain/room';
import { deploymentView } from '../infrastructure/room.reader';
import { toHttp } from './rooms.actions';

class SetDeploymentRequestDto extends createZodDto(SetDeploymentRequest) {}
class DeploymentChallengeDto extends createZodDto(DeploymentChallenge) {}
class VerifyDeploymentResponseDto extends createZodDto(VerifyDeploymentResponse) {}

function deploymentToHttp(err: unknown): never {
  if (err instanceof DeploymentNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'No deployment for this room' });
  }
  if (err instanceof ProofNotFoundError) {
    throw new UnprocessableEntityException({
      code: 'deployment.proof_missing',
      title: `The application does not serve the room token (${DEPLOYMENT_PROOF_PATH})`,
    });
  }
  if (err instanceof DeploymentUnreachableError) {
    throw new UnprocessableEntityException({
      code: 'deployment.unreachable',
      title: 'The application did not answer, or its address is not public',
    });
  }
  return toHttp(err);
}

/**
 * Idée A (Systalink) : prouver qu'une salle est en production. Écritures sans clé
 * d'idempotence : PUT est idempotent, la vérification peut être rejouée sans effet de bord
 * (les Proof XP sont uniques par salle). Voir docs/architecture/06-api.md.
 */
@Controller('api/v1/rooms/:id/deployment')
@UseGuards(SessionGuard)
export class DeploymentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deployments: Deployments,
  ) {}

  /** Jeton et état, réservés au créateur et aux mainteneurs. */
  @Get()
  @ApiOkResponse({ type: DeploymentChallengeDto })
  async challenge(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) roomId: string,
  ): Promise<DeploymentChallenge> {
    await this.assertManager(roomId, auth.userId);
    return this.view(roomId);
  }

  @Put()
  @ApiOkResponse({ type: DeploymentChallengeDto })
  async set(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Body() body: SetDeploymentRequestDto,
  ): Promise<DeploymentChallenge> {
    await this.deployments
      .set({ roomId, actorId: auth.userId, url: body.url })
      .catch(deploymentToHttp);
    return this.view(roomId);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOkResponse({ type: VerifyDeploymentResponseDto })
  async verify(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) roomId: string,
  ): Promise<VerifyDeploymentResponse> {
    const outcome = await this.deployments
      .verify({ roomId, actorId: auth.userId })
      .catch(deploymentToHttp);
    const { token: _token, proofPath: _path, ...deployment } = await this.view(roomId);
    return { deployment, xpAwarded: outcome.xpAwarded };
  }

  private async assertManager(roomId: string, userId: string): Promise<void> {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    if (!canManage(member?.role ?? null)) {
      throw new ForbiddenException({ code: 'forbidden', title: 'Only the room owner can do this' });
    }
  }

  private async view(roomId: string): Promise<DeploymentChallenge> {
    const d = await this.prisma.roomDeployment.findUnique({ where: { roomId } });
    if (!d)
      throw new NotFoundException({ code: 'not_found', title: 'No deployment for this room' });
    return { ...deploymentView(d), token: d.token, proofPath: DEPLOYMENT_PROOF_PATH };
  }
}
