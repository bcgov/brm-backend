import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GithubAuthController } from './github-auth.controller';
import { GithubAuthService } from './github-auth.service';
import { Response } from 'express';

describe('GithubAuthController', () => {
  let controller: GithubAuthController;
  let service: GithubAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubAuthController],
      providers: [
        {
          provide: GithubAuthService,
          useValue: {
            getGitHubAuthURL: jest.fn(),
            getAccessToken: jest.fn(),
            getGithubUser: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile();

    controller = module.get<GithubAuthController>(GithubAuthController);
    service = module.get<GithubAuthService>(GithubAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('redirectToGitHub', () => {
    it('should redirect to GitHub with the returnUrl', () => {
      const returnUrl = 'http://localhost:3000/home';
      const expectedUrl = 'https://github.com/login/oauth/authorize?...';
      jest.spyOn(service, 'getGitHubAuthURL').mockReturnValue(expectedUrl);

      const result = controller.redirectToGitHub(returnUrl);
      expect(service.getGitHubAuthURL).toHaveBeenCalledWith(returnUrl);
      expect(result).toEqual({ url: expectedUrl });
    });
  });

  describe('githubAuthCallback', () => {
    it('should handle the GitHub auth callback', async () => {
      const code = 'code123';
      const state = encodeURIComponent('http://localhost:3000/home');
      const accessToken = 'access_token_123';
      const githubUser = { login: 'user123' };

      jest.spyOn(service, 'getAccessToken').mockResolvedValue(accessToken);
      jest.spyOn(service, 'getGithubUser').mockResolvedValue(githubUser);

      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.githubAuthCallback(code, state, res);

      expect(service.getAccessToken).toHaveBeenCalledWith(code);
      expect(service.getGithubUser).toHaveBeenCalledWith(accessToken);
      expect(res.cookie).toHaveBeenCalledWith('github-authentication-token', accessToken, {
        httpOnly: true,
        secure: false,
      });
      expect(res.cookie).toHaveBeenCalledWith('github-authentication-username', githubUser.login, {
        httpOnly: true,
        secure: false,
      });
      expect(res.redirect).toHaveBeenCalledWith(decodeURIComponent(state) || '/');
    });
  });
});
