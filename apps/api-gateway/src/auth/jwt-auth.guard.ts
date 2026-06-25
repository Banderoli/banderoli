import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthUser } from './current-user.decorator';

interface JwtPayload {
  sub: string;
}

interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers['authorization'];

    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Отсутствует Bearer-токен');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(header.slice(7));
      request.user = { userId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }
}
