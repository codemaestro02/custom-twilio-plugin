import React, { useState, useEffect } from "react";
import axios from "axios";

const SMSChatComponent = () => {
	const [smsHistory, setSmsHistory] = useState([]);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [messageBody, setMessageBody] = useState("");
	const [responseMessage, setResponseMessage] = useState("");
	const [error, setError] = useState(null);

  // Polling interval for fetching new incoming messages
  const POLLING_INTERVAL = 5000; // Poll every 5 seconds

	// Fetch SMS history when component mounts or 'toNumber' changes
	useEffect(() => {
		const fetchSmsHistory = async () => {
			try {
				const response = await axios.get(
					`https://twilio-flask-1pq1.onrender.com/api/sms-logs`,
				);
        const data = await response.json();
				setSmsLogs(data);
			} catch (error) {
				console.error("Error fetching SMS history:", error);
			}
		};
    // Initial fetch
		fetchSmsHistory();

    // Polling function to fetch new SMS messages from receive-sms endpoint
    const interval = setInterval(fetchSmsLogs, POLLING_INTERVAL);

    // Clean up polling on component unmount
    return () => clearInterval(interval);
	}, []);

	// Handle form submission
	const sendSms = async (e) => {
		e.preventDefault();

		const data = {
			from,
			to,
			body: messageBody,
		};

		try {
			// Send POST request to the Flask backend
			const response = await fetch(
				"https://twilio-flask-1pq1.onrender.com/api/send-sms",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: JSON.stringify(data),
				},
			);

			const result = await response.json(); // Handle text response (Twilio's SMS response)

			if (response.ok) {
				setResponseMessage(
					`Message sent successfully! SID: ${result.message_sid}`,
				);
        // Fetch updated logs after sending SMS
        await fetchSmsHistory();
				setError(null);
			} else {
				setError(result.error || "Failed to send message");
			}
		} catch (err) {
			setError("An error occurred while sending the SMS");
		}
	};


	return (
		<div>
			<h3>SMS Chat</h3>
			<div className="sms-history">
				{smsHistory.map((msg, index) => (
					<li key={msg.message_sid}>
						<div
							key={index}
							className={msg.from === toNumber ? "customer" : "agent"}
						>
							<strong>From:</strong> {msg.from} <br />
							<strong>To:</strong> {msg.to} <br />
							<strong>Message:</strong> {msg.body} <br />
							<strong>Status:</strong> {msg.status} <br />
							<strong>Date Sent:</strong> {msg.date_sent}
						</div>
					</li>
				))}
			</div>

			<h2>Send and Receive SMS</h2>
			<form onSubmit={sendSms}>
				<label>
					From:
					<input
						type="text"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						required
					/>
				</label>
				<br />
				<label>
					To:
					<input
						type="text"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						required
					/>
				</label>
				<br />
				<label>
					Message Body:
					<textarea
						value={messageBody}
						onChange={(e) => setMessageBody(e.target.value)}
						required
					/>
				</label>
				<br />
				<button type="submit">Send SMS</button>
			</form>

			<hr />
			{responseMessage && (
				<div>
					<h3>Twilio Response:</h3>
					<p>{responseMessage}</p>
				</div>
			)}
			{error && (
				<div style={{ color: "red" }}>
					<p>Error: {error}</p>
				</div>
			)}
		</div>
	);
};

export default SMSChatComponent;
