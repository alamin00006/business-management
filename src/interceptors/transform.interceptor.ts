import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { classToPlain } from 'class-transformer';

export interface Response<T> {
  data: T;
  meta?: any;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => ({
        data: classToPlain(data.data || data) as T,
        meta: data.meta || undefined,
        timestamp,
        path: request.url,
      })),
    );
  }
}
