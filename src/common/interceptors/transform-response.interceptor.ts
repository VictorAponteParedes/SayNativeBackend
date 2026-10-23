import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/api-response.type';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // Si el resultado ya tiene una propiedad message separada
        const message = data && data.__message ? data.__message : undefined;
        if (data && data.__message) {
          delete data.__message;
        }

        return {
          success: true,
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
