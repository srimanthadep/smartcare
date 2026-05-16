import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/shared/contexts/SocketContext';

const EVENTS = {
  PATIENT_UPDATED:      'PATIENT_UPDATED',
  APPOINTMENT_UPDATED:  'APPOINTMENT_UPDATED',
  INVOICE_UPDATED:      'INVOICE_UPDATED',
  PRESCRIPTION_UPDATED: 'PRESCRIPTION_UPDATED',
  QUEUE_UPDATED:        'QUEUE_UPDATED',
  ACTIVITY_LOGGED:      'ACTIVITY_LOGGED',
};

export function useRealTimeUpdates() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // When backend emits PATIENT_UPDATED, invalidate patients cache → auto-refetch
    socket.on(EVENTS.PATIENT_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on(EVENTS.APPOINTMENT_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on(EVENTS.INVOICE_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on(EVENTS.PRESCRIPTION_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    });

    socket.on(EVENTS.QUEUE_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    });

    socket.on(EVENTS.ACTIVITY_LOGGED, () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    });

    return () => {
      Object.values(EVENTS).forEach(event => socket.off(event));
    };
  }, [socket, queryClient]);
}
