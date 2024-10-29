import axios from "axios";
import React, { useEffect, useState } from "react";

const CallLogComponent = () => {
	const [callLogs, setCallLogs] = useState([]);
	const [taskLogs, setTaskLogs] = useState([]);

	// Fetch call logs from the Flask API
	const fetchCallLogs = async () => {
		try {
			const response = await axios.get(
				"https://twilio-flask-1pq1.onrender.com/api/call-logs",
			);
			setCallLogs(response.data);
		} catch (error) {
			console.error("Error fetching call logs:", error);
		}
	};

	// Fetch task logs from the Flask API
	const fetchTaskLogs = async () => {
		try {
			const response = await axios.get(
				"https://twilio-flask-1pq1.onrender.com/api/task-logs",
			);
			setTaskLogs(response.data);
		} catch (error) {
			console.error("Error fetching task logs:", error);
		}
	};

	useEffect(() => {
		fetchCallLogs();
		fetchTaskLogs();
	}, []);

	return (
		<div>
			<h3>Call History</h3>
			<table>
				<thead>
					<tr>
						<th>Date Created</th>
						<th>From</th>
						<th>To</th>
						<th>Duration</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{callLogs.map((call) => (
						<tr key={call.sid}>
							<td>{new Date(call.dateCreated).toLocaleString()}</td>
							<td>{call.from}</td>
							<td>{call.to}</td>
							<td>{call.duration}s</td>
							<td>{call.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		

			<h3>Task History</h3>
			<ul>
				{taskLogs.map((task, index) => (
					<li key={index}>
						Task ID: {task.sid} | Status: {task.status} | Created:{" "}
						{task.created_time} | Attributes: {task.attributes}
					</li>
				))}
			</ul>
		</div>
	);
};

export default CallLogComponent;
