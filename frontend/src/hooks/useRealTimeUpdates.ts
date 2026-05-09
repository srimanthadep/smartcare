import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';

export const useRealTimeUpdates = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (event: string, message: string, queryKeys: string[][]) => {
      socket.on(event, (data) => {
        console.log(`📡 Real-time update received: ${event}`, data);
        
        // Invalidate relevant queries
        queryKeys.forEach(keys => {
          queryClient.invalidateQueries({ queryKey: keys });
        });

        // Show a subtle toast if needed
        if (message) {
          toast.info(message, {
            description: data.name || data.patientName || data.id,
            duration: 3000,
          });
        }
      });
    };

    handleUpdate('PATIENT_UPDATED', 'Patient data updated', [['patients']]);
    handleUpdate('APPOINTMENT_UPDATED', 'Schedule updated', [['appointments'], ['dashboard']]);
    handleUpdate('INVOICE_UPDATED', 'Invoice status changed', [['invoices'], ['dashboard']]);
    handleUpdate('PRESCRIPTION_UPDATED', 'Prescription updated', [['prescriptions']]);
    handleUpdate('ACTIVITY_LOGGED', '', [['logs']]);
    handleUpdate('QUEUE_UPDATED', 'Queue updated', [['queue'], ['dashboard']]);

    return () => {
      socket.off('PATIENT_UPDATED');
      socket.off('APPOINTMENT_UPDATED');
      socket.off('INVOICE_UPDATED');
      socket.off('PRESCRIPTION_UPDATED');
      socket.off('ACTIVITY_LOGGED');
      socket.off('QUEUE_UPDATED');
    };
  }, [socket, queryClient]);
};
