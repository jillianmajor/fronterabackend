import { Body, Controller, Get, Header, Inject, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { extractErrorMessage } from '../../common/errors/utils/error-message.util';
import { TOKENS } from '../../config/tokens';
import type { IInvitesService } from './invites.interface';

/** HTML accept-invite flow (not JSON) — excluded from Swagger. */
@ApiExcludeController()
@Public()
@Controller()
export class InvitesController {
  constructor(
    @Inject(TOKENS.InvitesService)
    private readonly invites: IInvitesService,
  ) {}

  @Get('accept-invite')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async showForm(@Query('token') token: string, @Res() res: Response): Promise<void> {
    const html = await this.invites.renderInvitePage(token);
    res.status(200).send(html);
  }

  @Post('accept-invite')
  async submitForm(
    @Body() body: { token?: string; password?: string; confirmPassword?: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { redirectUrl } = await this.invites.activateFromForm(body);
      if (redirectUrl.startsWith('http')) {
        res.redirect(302, redirectUrl);
        return;
      }
      res
        .status(200)
        .type('html')
        .send(
          '<!DOCTYPE html><html><body><p>Account activated. You can close this page and sign in to the provider portal.</p></body></html>',
        );
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not activate account. Please try again.');
      const html = await this.invites.renderInvitePage(body.token, message);
      res.status(400).type('html').send(html);
    }
  }
}
