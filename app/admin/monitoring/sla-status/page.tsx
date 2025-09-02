"use client";

import { SessionWrapper } from '@/components/session-wrapper';
import SLAMonitoringStatus from '@/components/sla-monitoring-status';

export default function SLAMonitoringPage() {
  return (
    <SessionWrapper>
      <SLAMonitoringStatus />
    </SessionWrapper>
  );
}
