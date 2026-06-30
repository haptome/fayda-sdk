import { createParamDecorator, ExecutionContext, Inject } from "@nestjs/common";

/** Inject FaydaService into a constructor parameter */
export const InjectFayda = () => Inject("FAYDA_SERVICE");

/** Extract the authenticated Fayda user from the request (set by your auth guard) */
export const FaydaUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    return request.user;
  }
);

/** Extract OAuth callback query params from the request */
export const FaydaCallback = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ query: Record<string, string> }>();
    return {
      code: request.query["code"],
      state: request.query["state"],
      error: request.query["error"],
      errorDescription: request.query["error_description"],
    };
  }
);
