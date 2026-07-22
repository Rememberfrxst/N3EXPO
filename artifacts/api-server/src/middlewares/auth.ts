import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '@workspace/db';
import { users } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export interface AuthRequest extends Request {
  user?: typeof users.$inferSelect;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Invalid token format' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role: string };
    
    const userRecords = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    const user = userRecords[0];

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Unauthorized: Token expired', expired: true });
      return;
    }
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};

export const requireRole = (role: 'admin' | 'seller') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: `Forbidden: Requires ${role} role` });
      return;
    }
    
    next();
  };
};
