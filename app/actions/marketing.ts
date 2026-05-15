"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitMarketingLead(formData: FormData) {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const phone = field(formData, "phone");
  const goal = field(formData, "goal");
  const message = field(formData, "message");

  if (!name || !email || !goal) {
    redirect("/?lead=missing#contact");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("marketing_leads").insert([
    {
      name,
      email,
      phone: phone || null,
      goal,
      message: message || null,
    },
  ]);

  if (error) {
    redirect("/?lead=error#contact");
  }

  redirect("/?lead=thanks#contact");
}
