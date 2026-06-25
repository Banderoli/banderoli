import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@banderoli/database';

// Минимальный контракт ответа, чтобы не тянуть express в общую библиотеку.
interface HttpResponseLike {
  status(code: number): { json(body: unknown): void };
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponseLike>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Запись с такими данными уже существует';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Запись не найдена';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Нарушение ссылочной целостности';
        break;
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
    });
  }
}
