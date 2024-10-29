import axios from 'axios';
import React, { useEffect, useState } from 'react';

const CallIdentificationComponent = ({ task }) => {
    const [callLocation, setCallLocation] = useState('Fetching friendly name and location...');

    useEffect(() => {
        // Fetch the location of the call based on the caller's phone number
        const fetchCallLocation = async (phoneNumber) => {
            try {
                const response = await axios.get(`https://twilio-flask-1pq1.onrender.com/api/call-location-name/${phoneNumber}`);
                setCallLocation(response.data);
            } catch (error) {
                console.error('Error fetching call location:', error);
                setCallLocation('Unknown');
            }
        };

        if (task && task.attributes.from) {
            fetchCallLocation(task.attributes.from);  // The caller's phone number is in task.attributes.from
        }
    }, [task]);

    return (
        <div>
            <h3>Caller Location and Name</h3>
            <p>{callLocation}</p>
        </div>
    );
};

export default CallIdentificationComponent;
