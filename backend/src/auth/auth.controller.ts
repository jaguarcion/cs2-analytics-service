import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('AUTH_TOKEN', '');
  }

  @Post('login')
  login(@Body() body: { token: string }) {
    if (!this.token) {
      // No token configured — allow any
      return { success: true };
    }

    if (body.token === this.token) {
      return { success: true };
    }

    throw new UnauthorizedException('Invalid token');
  }
}
