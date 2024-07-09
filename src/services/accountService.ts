import prisma from '../config/db';
import bcrypt from 'bcrypt';

export async function registerUser(name: string, email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword,
        }
    });
    return user;
}

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: {email},
    });
}

export async function findUserById(id: number) {
    return prisma.user.findUnique({
        where: {id},
    });
}