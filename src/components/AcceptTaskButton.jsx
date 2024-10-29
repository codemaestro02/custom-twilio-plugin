import React from "react";
import { Actions, withTaskContext } from "@twilio/flex-ui";

class AcceptTaskButton extends React.Component {
	handleAcceptTask = () => {
		const { task } = this.props;

		if (task && task.taskChannelUniqueName === "voice") {
			Actions.invokeAction("AcceptTask", { sid: task.sid })
				.then(() => {
					// Successfully accepted task
					console.log(`Task ${task.sid} accepted`);
				})
				.catch((error) => {
					// Handle task acceptance error
					console.error(`Failed to accept task ${task.sid}:`, error.message);
				});
		}
	};

	render() {
		return (
			<div className="custom-task-accept-button">
				<div>
					<p>
						Broadcasting Tasks: Multiple agents can view and accept this task
					</p>
				</div>
				<button onClick={this.handleAcceptTask}>Accept Call</button>
			</div>
		);
	}
}

export default withTaskContext(AcceptTaskButton);
