"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth";

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
