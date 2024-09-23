import { Injectable } from '@nestjs/common';
import axios from 'axios';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';
const GITHUB_USER_URL = 'https://api.github.com/user';

@Injectable()
export class GithubAuthService {
  private readonly redirectUri = `${process.env.FRONTEND_URI}/auth/github/callback`;

  /**
   * Gnerates URL for GitHub oauth flow
   * @param returnUrl the URL on our site we want to return to after going through github oauth flow
   * @returns oauth URL
   */
  getGitHubAuthURL(returnUrl: string = '/') {
    // URL encode the returnUrl to ensure it's safely transmitted
    const encodedReturnUrl = encodeURIComponent(returnUrl);
    // Include the encoded returnUrl in the state parameter
    const state = encodedReturnUrl;
    const url = `${GITHUB_OAUTH_URL}/authorize?client_id=${process.env.GITHUB_APP_CLIENT_ID}&redirect_uri=${this.redirectUri}&scope=repo,read:user&state=${state}`;
    return url;
  }

  /**
   * Gets the oauth access token for a user from the oauth code
   * @param code generated by oauth flow
   * @returns oauth access token
   */
  async getAccessToken(code: string): Promise<string> {
    const response = await axios.post(
      `${GITHUB_OAUTH_URL}/access_token`,
      {
        client_id: process.env.GITHUB_APP_CLIENT_ID,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
        code,
        redirect_uri: this.redirectUri,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
    return response.data.access_token;
  }

  /**
   * Gets the Github user information (username, etc.)
   * @param accessToken token of user
   * @returns GitHub user info
   */
  async getGithubUser(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(GITHUB_USER_URL, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GitHub user:', error);
      throw new Error('Failed to fetch GitHub user information');
    }
  }
}