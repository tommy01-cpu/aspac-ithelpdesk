'use client';

import { useEffect, useState } from 'react';

interface TechnicianNameProps {
  technicianId: string | number | null;
  fallback?: string;
}

export default function TechnicianName({ technicianId, fallback = "-" }: TechnicianNameProps) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!technicianId) {
      setName(null);
      return;
    }

    setLoading(true);
    
    // Fetch technician name from our API
    fetch(`/api/users/${technicianId}/name`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setName(data.name || fallback);
      })
      .catch(() => {
        setName(fallback);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [technicianId, fallback]);

  if (loading) {
    return <span className="text-gray-400">Loading...</span>;
  }

  return <span>{name || fallback}</span>;
}