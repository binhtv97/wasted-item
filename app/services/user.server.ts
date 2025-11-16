import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createUser(params: { email?: string; username: string; pin: string; name: string }) {
  const { email, username, pin, name } = params;
  const pinHash = await bcrypt.hash(pin, 10);
  return prisma.user.create({
    data: {
      email,
      username,
      pinHash,
      name,
    },
  });
}

export async function validateUser(username: string, pin: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.pinHash) return null;
  const isValid = await bcrypt.compare(pin, user.pinHash);
  return isValid ? user : null;
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({ 
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    }
  });
}

export async function updateUser(id: number, data: { name?: string; email?: string }) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    }
  });
}