"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

export async function register(formData: FormData) {
  const result = registerSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) redirect("/register?error=invalid");

  const existingUser = await prisma.user.findUnique({ where: { email: result.data.email } });
  if (existingUser) redirect("/register?error=exists");

  const password = await bcrypt.hash(result.data.password, 12);
  await prisma.user.create({
    data: { name: result.data.name, email: result.data.email, password },
  });

  redirect("/login?registered=1");
}
