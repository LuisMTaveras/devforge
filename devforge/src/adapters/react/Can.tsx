import React, { ReactNode } from 'react';
import { Action, Subject, globalAbility } from '../../core/permissions/ability.js';

export interface CanProps {
  I: Action;
  a?: Subject;
  an?: Subject;
  this?: Subject;
  data?: Record<string, unknown>;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ I, a, an, this: thisSubject, data, children, fallback = null }: CanProps) {
  const subject = a || an || thisSubject || 'all';
  const allowed = globalAbility.can(I, subject, data);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
