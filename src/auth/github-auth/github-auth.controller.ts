import { Controller, Get, Query, Redirect, Res, Post, Logger } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GithubAuthService } from './github-auth.service';

@Controller('auth/github')
export class GithubAuthController {
  constructor(
    private readonly authService: GithubAuthService,
    private readonly logger: Logger,
  ) {}

  /**
   * Redirect to github for oauth flow
   * @param returnUrl the URL on our site we want to return to after going through github oauth flow
   * @returns
   */
  @Get()
  @Redirect()
  @ApiOperation({ summary: 'Redirect to GitHub OAuth login page' })
  @ApiQuery({
    name: 'returnUrl',
    required: false,
    description: 'URL to redirect to after successful authentication',
    example: process.env.FRONTEND_URI || 'http://localhost:3000',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to GitHub OAuth page',
  })
  redirectToGitHub(@Query('returnUrl') returnUrl?: string) {
    const url = this.authService.getGitHubAuthURL(returnUrl);
    return { url };
  }

  /**
   * This is the endpoint that github will call after it's been authorized by an account
   * @param code used to get the user oauth token
   * @param state used to get the URL on our site to return to
   * @param res
   */
  @Get('callback')
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Authorization code from GitHub',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'Return URL encoded in state parameter',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to original return URL with authenticated session',
  })
  async githubAuthCallback(@Query('code') code: string, @Query('state') state: string, @Res() res) {
    const accessToken = await this.authService.getAccessToken(code);
    const githubUser = await this.authService.getGithubUser(accessToken);
    // Set the server-side cookies
    res.cookie('github-authentication-token', accessToken, { httpOnly: true });
    res.cookie('github-authentication-username', githubUser.login, { httpOnly: true });
    // Decode to get the redirect url and redirect there
    const returnUrl = decodeURIComponent(state);
    res.redirect(returnUrl || '/');
  }

  /**
   * Remove a user's github oauth token/username to log then out
   * @param res
   */
  @Post('logout')
  @ApiOperation({ summary: 'Logout user from GitHub authentication' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      example: { message: 'Logged out successfully' },
    },
  })
  async logoutOfGithubApp(@Res() res) {
    // Set the server-side cookies to empty in order to 'logout' the user from their github oauth
    res.cookie('github-authentication-token', '', { httpOnly: true });
    res.cookie('github-authentication-username', '', { httpOnly: true });
    res.status(200).send({ message: 'Logged out successfully' });
  }
}
