// src/actions/customActions.js
import { Actions, Notifications, StateHelper } from '@twilio/flex-ui';
import TaskHandler from '../services/TaskHandler';

export const registerCustomActions = (manager) => {
  // Override the default AcceptTask action
  Actions.replaceAction('AcceptTask', async (payload, original) => {
    const { task } = payload;
    
    try {
      // Get the current reservation
      const reservation = StateHelper.getTaskById(task.taskSid)?.reservation;
      
      if (!reservation) {
        throw new Error('No reservation found for task');
      }

      // Use custom task handler with retry logic
      await TaskHandler.acceptTask(task, reservation);
      
      // Start monitoring the reservation state
      TaskHandler.monitorReservation(reservation);
      
    } catch (error) {
      console.error('Error accepting task:', error);
      
      // Show appropriate notification based on error
      if (error.message.includes('Reservation') || error.status === 400) {
        Notifications.showNotification('TaskReservationError', {
          message: 'Unable to accept task. Please try again.'
        });
      } else {
        Notifications.showNotification('Error', {
          message: 'An unexpected error occurred while accepting the task.'
        });
      }
      
      throw error;
    }
  });
};