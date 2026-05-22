import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedUser } from './store.js';

export const CurrentUser = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.user as AuthenticatedUser;
});
