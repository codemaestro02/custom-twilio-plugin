// src/utils/apiHandler.js
import axios from 'axios';

class APIHandler {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error);
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Response Data:', error.response.data);
          console.error('Response Status:', error.response.status);
          console.error('Response Headers:', error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('Request Error:', error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error Message:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
      return { error: true, message: 'Failed to fetch data' };
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      return { error: true, message: 'Failed to send data' };
    }
  }

  handleError(error) {
    // Log error to your preferred logging service
    console.error('API Error:', error);
    
    // You can implement custom error handling here
    if (error.response?.status === 401) {
      // Handle unauthorized access
      Flex.Manager.getInstance().store.dispatch({
        type: 'AUTHENTICATION_ERROR'
      });
    }
  }
}

export default new APIHandler();