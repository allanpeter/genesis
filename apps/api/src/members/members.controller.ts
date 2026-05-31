import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  acceptInviteSchema,
  inviteMemberSchema,
  type AcceptInviteInput,
  type AuthUser,
  type InviteMemberInput,
} from '@genesis/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.members.list(user.organizationId);
  }

  @Get('invites')
  @Roles('ADMIN')
  listInvites(@CurrentUser() user: AuthUser) {
    return this.members.listPendingInvites(user.organizationId);
  }

  @Post('invite')
  @Roles('ADMIN')
  invite(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.members.invite(user.organizationId, user.id, body);
  }

  @Post('accept')
  @Public()
  accept(@Body(new ZodValidationPipe(acceptInviteSchema)) body: AcceptInviteInput) {
    return this.members.accept(body);
  }

  @Delete('invites/:id')
  @Roles('ADMIN')
  revokeInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.members.revokeInvite(user.organizationId, id);
  }

  @Delete(':userId')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.members.removeMember(user.organizationId, user.id, userId);
  }
}
