"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface StatusSwitchProps {
  user: any;
}

export default function StatusSwitch({ user }: StatusSwitchProps) {
  const [checked, setChecked] = useState(user.emp_status === "active");
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: boolean) => {
    const newStatus = value ? "active" : "inactive";
    const confirmMsg = `Do you want to make this user ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setChecked(value);
      toast({ title: `User status updated to ${newStatus}` });
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      checked={checked}
      disabled={loading}
      onCheckedChange={handleChange}
      className={checked ? "bg-green-500" : "bg-gray-300"}
    />
  );
}
