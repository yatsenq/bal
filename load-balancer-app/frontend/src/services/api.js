import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/api'
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost/ws'

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
})

api.interceptors.request.use(
	config => {
		const token = localStorage.getItem('token')
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	error => {
		return Promise.reject(error)
	}
)

api.interceptors.response.use(
	response => response,
	error => {
		if (error.response && error.response.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('user')
			window.location.href = '/login'
		}
		return Promise.reject(error)
	}
)

export const authAPI = {
	login: (username, password) =>
		api.post('/auth/login', { username, password }),

	register: (username, password) =>
		api.post('/auth/register', { username, password }),
}

export const tasksAPI = {
	create: matrix => api.post('/tasks', { matrix }),

	getAll: (params = {}) => api.get('/tasks', { params }),

	getById: id => api.get(`/tasks/${id}`),

	cancel: id => api.put(`/tasks/${id}/cancel`),

	delete: id => api.delete(`/tasks/${id}`),
}

export const adminAPI = {
	getMonitoring: () => api.get('/admin/monitoring'),
	getAllTasks: (params = {}) => api.get('/admin/tasks', { params }),
	getSystemStats: () => api.get('/admin/system-stats'), // ← ДОДАТИ
}

export default api
