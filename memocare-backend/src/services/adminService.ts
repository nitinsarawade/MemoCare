import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';

export async function createHospital(name: string, address?: string) {
  const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
  return prisma.hospital.create({ data: { name, address, inviteCode, isApproved: true } });
}

export async function listHospitals() {
  return prisma.hospital.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getHospital(hospitalId: string) {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) throw AppError.notFound('Hospital not found');
  return hospital;
}

export async function updateHospital(hospitalId: string, input: { name?: string; address?: string }) {
  return prisma.hospital.update({ where: { id: hospitalId }, data: input });
}

export async function rotateHospitalInviteCode(hospitalId: string) {
  const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
  return prisma.hospital.update({ where: { id: hospitalId }, data: { inviteCode } });
}

export async function listPendingStaff() {
  return prisma.user.findMany({
    where: { role: 'HOSPITAL_STAFF', status: 'PENDING_APPROVAL' },
    include: { hospital: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function approveStaff(userId: string, staffTitle: 'DOCTOR' | 'NURSE' | 'CLINICIAN' | 'ADMIN_STAFF') {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  if (user.role !== 'HOSPITAL_STAFF') throw AppError.badRequest('User is not a hospital staff account');
  if (user.status !== 'PENDING_APPROVAL') throw AppError.conflict('User is not pending approval');

  return prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE', staffTitle } });
}

export async function rejectStaff(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  return prisma.user.update({ where: { id: userId }, data: { status: 'REJECTED' } });
}

export async function suspendUser(userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
}

export async function reactivateUser(userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
}

export async function listUsers(filters: { role?: string; status?: string }) {
  return prisma.user.findMany({
    where: {
      role: filters.role as any,
      status: filters.status as any,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
