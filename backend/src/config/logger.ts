import pino from "pino";
import { pinoHttp } from "pino-http";
import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { RequestHandler } from "express";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    const r = req as IncomingMessage & { id?: string };
    return r.id || (r.headers["x-request-id"] as string | undefined) || randomUUID();
  },
  serializers: {
    req: (req) => {
      const r = req as IncomingMessage & { id?: string };
      return {
        id: r.id,
        method: r.method,
        url: r.url,
      };
    },
    res: (res) => ({
      statusCode: (res as ServerResponse).statusCode,
    }),
  },
}) as RequestHandler;

export default logger;
