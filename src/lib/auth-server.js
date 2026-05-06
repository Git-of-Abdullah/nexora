import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export function verifyToken(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(handler, ...allowedRoles) {
  return async (request, context) => {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(request, context, user);
  };
}
