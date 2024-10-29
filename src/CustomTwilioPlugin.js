import React from "react";
import { FlexPlugin } from "@twilio/flex-plugin";
import { registerCustomActions } from './actions/customActions';
import { CustomizationProvider, Manager, NotificationType } from '@twilio/flex-ui';
import CallIdentificationComponent from './components/CallIdentificationComponent';
import CallLogComponent from './components/CallLog';
import SMSChatComponent from './components/SMSChat';
import CustomTaskList from "./components/CustomTaskList/CustomTaskList";

const PLUGIN_NAME = "CustomTwilioPlugin";

export default class CustomTwilioPlugin extends FlexPlugin {
	constructor() {
		super(PLUGIN_NAME);
	}

	/**
	 * This code is run when your plugin is being started
	 * Use this to modify any UI components or attach to the actions framework
	 *
	 * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
	 */
	async init(flex, manager) {

    try{
      await this.validatePlugin(manager);

      // Register custom notifications
      flex.Notifications.registerNotification({
        id: 'TaskReservationError',
        type: NotificationType.error,
        message: 'Unable to accept task. The reservation state has changed.'
      });

      // Register custom actions
      registerCustomActions(manager);

      // Set up error notification handler
      flex.Notifications.registerNotification({
        id: "ApiError",
        type: NotificationType.error,
        message:
          "An error occurred while processing your request. Please try again.",
      });

      // Notification configuration
      flex.Notifications.registerNotification({
        id: "MissedCallNotification",
        content: "You missed a call from {{callerNumber}}",
        type: flex.NotificationType.warning,
      });

      flex.Notifications.registerNotification({
        id: "TaskAcceptedNotification",
        content: "You accepted a call from {{callerNumber}}",
        type: flex.NotificationType.success,
      });

      flex.Notifications.registerNotification({
        id: "TaskErrorNotification",
        content: "Error accepting task: {{message}}",
        type: flex.NotificationType.error,
      });

      // Add the Call Identification Component to the Task Canvas for voice tasks
      flex.TaskCanvas.Content.add(
        <CallIdentificationComponent key="call-location" />,
        {
          sortOrder: 1,
          if: (props) => props.task.taskChannelUniqueName === "voice",
        },
      );

      // Add the Call Log component to the SideNav as a custom view
      flex.AgentDesktopView.Panel1.Content.add(<CallLogComponent key="call-log" />, {
        sortOrder: 2, // You can adjust the order based on your preference
      });
      

      // Add SMSChatComponent to TaskCanvasTabs
      flex.TaskCanvasTabs.Content.add(
        <SMSChatComponent key="sms-chat" toNumber="customerPhoneNumber" />,
        {
          sortOrder: 3, // You can adjust the order based on your preference
          if: (props) => props.task.taskChannelUniqueName === "sms",
        },
      );

      // Add a custom field to the TaskList to display the Twilio number
      flex.TaskList.Content.add(
        <div>
          {props.task.attributes.conversationType === "sms" && (
            <p>SMS via Twilio Number: {props.task.attributes.to}</p>
          )}
        </div>,
        {
          sortOrder: 4,
          if: (props) => props.task.taskChannelUniqueName === "sms",
        },
      );


      // Add a custom action for sending SMS from the correct Twilio number
      flex.Actions.addListener("beforeSendMessage", (payload, abortFunction) => {
        if (payload.conversationType === "sms") {
          const twilioNumber = payload.task.attributes.to; // Get the Twilio number used in the conversation
          const message = payload.body; // The message being sent
          const toNumber = payload.task.attributes.from; // The customer's phone number

          // Call backend API to send SMS
          axios
            .post("https://twilio-flask-1pq1.onrender.com/api/send-sms", {
              from: twilioNumber,
              to: toNumber,
              body: message,
            })
            .then((response) => {
              console.log("SMS sent successfully:", response.data);
            })
            .catch((error) => {
              console.error("Error sending SMS:", error);
              abortFunction();
            });

          // Prevent Flex from sending the message, since we're handling it
          abortFunction();
        }
      });

      manager.workerClient.on('activityUpdated', async (worker) => {
        console.log('Worker activity updated:', worker.activity);
      });

      // 4. Agent Call Handling
      manager.updateConfig({
        wrapupTimeout: 0,
        enableAutomaticAvailability: false
      });

      // Allow multiple agents to view same task
      flex.TaskList.Content.add(
        <CustomizationProvider>
          {props => ({
            ...props,
            allowMultipleTaskSelection: true
          })}
        </CustomizationProvider>
      );

      // Add global error handler
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      

      // Register event handlers for missed calls and task assignment
      this.registerMissedCallHandler(flex, manager);
      this.registerTaskAssignmentHandler(flex, manager);

      // Add the Accept Task Button
      this.addAcceptTaskButton(flex);

      // Configure reservation handling
      manager.workerClient.on('reservationCreated', reservation => {
        console.log('New reservation created:', reservation);
        reservation.on('accepted', this.handleReservationAccepted);
        reservation.on('rejected', this.handleReservationRejected);
        reservation.on('timeout', this.handleReservationTimeout);
        reservation.on('canceled', this.handleReservationCanceled);
      });

	  } catch (error) {
      console.error('Plugin initialization error:', error);
      flex.Notifications.showNotification('ApiError');
    }
  }

  async validatePlugin(manager) {
    // Check Flex UI version
    const flexVersion = manager.serviceConfiguration.ui_version;
    if (!this.isVersionCompatible(flexVersion)) {
      throw new Error(`Incompatible Flex UI version: ${flexVersion}`);
    }
  
    // Validate required dependencies
    const requiredDependencies = ['@twilio/flex-ui', 'react', 'react-dom'];
    for (const dep of requiredDependencies) {
      if (!this.isDependencyInstalled(dep)) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  
    // Validate configuration
    if (!this.isConfigurationValid(manager.configuration)) {
      throw new Error('Invalid plugin configuration');
    }
  }

  handleReservationAccepted = (reservation) => {
    console.log('Reservation accepted:', reservation);
  };

  handleReservationRejected = (reservation) => {
    console.log('Reservation rejected:', reservation);
  };

  handleReservationTimeout = (reservation) => {
    console.log('Reservation timed out:', reservation);
  };

  handleReservationCanceled = (reservation) => {
    console.log('Reservation canceled:', reservation);
  };

	registerMissedCallHandler(flex, manager) {
		// Listen for when a task is marked as "reservationTimeout" (missed call)
		flex.Actions.addListener("afterReservationTimeout", (payload) => {
			// Prevent the agent from going offline after missing the call
			const workerSid = manager.workerClient.sid;

			// Keep the agent in an "Available" state unless they manually change it
			manager.workerClient
				.update({
					activitySid:
						manager.serviceConfiguration.taskrouter_worker_attributes
							.available_activity_sid,
				})
				.then(() => {
					console.log("Agent kept available after missed call");
				})
				.catch((error) => {
					console.error("Error updating agent status:", error);
				});

			flex.Notifications.showNotification("MissedCallNotification", {
				callerNumber: reservation.task.attributes.from,
			});
		});
	}

	registerTaskAssignmentHandler(flex, manager) {
		const beforeAcceptTaskListener = (payload, abortFunction) => {
			alert("Before event");
			if (!window.confirm("Are you sure you want to accept the task?")) {
				abortFunction();
			}
		};

		// Handle task assignment, allow multiple agents to view/accept the same task
		manager.workerClient.on("reservationCreated", (reservation) => {
			if (reservation.task.taskChannelUniqueName === "voice") {
				Actions.addListener("beforeAcceptTask", beforeAcceptTaskListener);
				flex.Actions.invokeAction("AcceptTask", { sid: reservation.sid })
					.then(() => {
						flex.Notifications.showNotification("TaskAcceptedNotification", {
							callerNumber: reservation.task.attributes.from,
						});
					})
					.catch((error) => {
						flex.Notifications.showNotification("TaskErrorNotification", {
							message: error.message,
						});
					});
			}
		});
	}

	addAcceptTaskButton(flex) {
		// Add Accept Task Button to Task Canvas
		flex.TaskCanvas.Content.add(<AcceptTaskButton key="accept-task-button" />, {
			sortOrder: 6,
			if: (props) => props.task.taskChannelUniqueName === "voice",
		});
	}

  /**
   * Handle any unhandled promise rejections
   */
  handleUnhandledRejection(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    const flex = Manager.getInstance();
    flex.Notifications.showNotification('ApiError');
    
    // Prevent the default browser handling of the error
    event.preventDefault();
  }
}

