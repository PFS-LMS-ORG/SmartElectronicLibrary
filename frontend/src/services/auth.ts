import axios from 'axios';

// Use relative URL to leverage Vite's proxy
const API_URL = '/api/auth';

interface RegisterData {
    name: string;
    email: string;
    password: string;
}

interface LoginData {
    email: string;
    password: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface LoginResponse {
    access_token: string;
    user: User;
}

export const register = async (data: RegisterData): Promise<{ message: string }> => {
    const response = await axios.post(`${API_URL}/register`, data);
    return response.data;
};

export const login = async (data: LoginData): Promise<LoginResponse> => {
    const response = await axios.post(`${API_URL}/login`, data);
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const response = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const logout = (): void => {
    localStorage.removeItem('token');
};