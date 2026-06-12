import { getToken } from "next-auth/jwt";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import type { User } from "./generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  try {
    const token = await getToken({
      req: req as Parameters<typeof getToken>[0]["req"],
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
    });

    const email = typeof token?.email === "string" ? token.email.trim() : null;
    if (!email) return null;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: typeof token.name === "string" ? token.name : undefined,
        image: typeof token.picture === "string" ? token.picture : undefined,
      },
      create: {
        email,
        name: typeof token.name === "string" ? token.name : undefined,
        image: typeof token.picture === "string" ? token.picture : undefined,
      },
    });

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}
