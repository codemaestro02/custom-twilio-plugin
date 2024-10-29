// src/services/TaskHandler.js
import { Manager } from '@twilio/flex-ui';

class TaskHandler {
  constructor() {
    this.manager = Manager.getInstance();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async acceptTask(task, reservation) {
    let attempts = 0;
    
    const acceptWithRetry = async () => {
      try {
        // Check reservation state before proceeding
        if (reservation.status !== 'pending') {
          throw new Error(`Invalid reservation state: ${reservation.status}`);
        }

        // Accept the task with conference instruction
        await reservation.accept({
          softPhone: {
            maxRetries: 3,
            retryInterval: 1000
          }
        });

        // Update worker activity to ensure availability
        await this.updateWorkerActivity('available');

      } catch (error) {
        attempts++;
        
        if (attempts < this.maxRetries && 
            (error.message.includes('Reservation') || error.status === 400)) {
          console.warn(`Attempt ${attempts} failed, retrying...`, error);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          
          // Refresh task and reservation data
          const updatedTask = await this.manager.store.dispatch(
            this.manager.actions.TaskRouter.getTask(task.taskSid)
          );
          
          if (updatedTask.reservation.status === 'pending') {
            return acceptWithRetry();
          }
        }
        
        throw error;
      }
    };

    return acceptWithRetry();
  }

  async updateWorkerActivity(activityName) {
    const { worker } = this.manager.store.getState().flex;
    const activity = worker.activities.find(a => a.name.toLowerCase() === activityName.toLowerCase());
    
    if (activity && worker.activity.sid !== activity.sid) {
      await this.manager.store.dispatch(
        this.manager.actions.Worker.setActivity(activity.sid)
      );
    }
  }

  // Monitor reservation state changes
  monitorReservation(reservation) {
    const stateChangeCallback = async (event) => {
      console.log('Reservation state changed:', event);
      
      if (event.reservation.status === 'wrapping') {
        await this.handleWrapping(event.reservation);
      }
    };

    reservation.on('accepted', stateChangeCallback);
    reservation.on('rejected', stateChangeCallback);
    reservation.on('timeout', stateChangeCallback);
    reservation.on('canceled', stateChangeCallback);
    reservation.on('rescinded', stateChangeCallback);
    
    return () => {
      reservation.removeListener('accepted', stateChangeCallback);
      reservation.removeListener('rejected', stateChangeCallback);
      reservation.removeListener('timeout', stateChangeCallback);
      reservation.removeListener('canceled', stateChangeCallback);
      reservation.removeListener('rescinded', stateChangeCallback);
    };
  }

  async handleWrapping(reservation) {
    try {
      // Ensure worker stays available
      await this.updateWorkerActivity('available');
    } catch (error) {
      console.error('Error handling wrapping state:', error);
    }
  }
}

export default new TaskHandler();