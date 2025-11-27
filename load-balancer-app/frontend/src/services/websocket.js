import { WS_URL } from './api'

class WebSocketService {
	constructor() {
		this.ws = null
		this.listeners = new Map()
		this.reconnectAttempts = 0
		this.maxReconnectAttempts = 5
		this.reconnectDelay = 3000
	}

	connect(token) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log('WebSocket already connected')
			return
		}

		try {
			this.ws = new WebSocket(`${WS_URL}?token=${token}`)

			this.ws.onopen = () => {
				console.log('WebSocket connected')
				this.reconnectAttempts = 0
				this.notifyListeners('connected', { connected: true })
			}

			this.ws.onmessage = event => {
				try {
					const message = JSON.parse(event.data)
					console.log('WebSocket message:', message)
					this.notifyListeners(message.type, message)
				} catch (error) {
					console.error('Error parsing WebSocket message:', error)
				}
			}

			this.ws.onerror = error => {
				console.error('WebSocket error:', error)
				this.notifyListeners('error', { error })
			}

			this.ws.onclose = () => {
				console.log('WebSocket disconnected')
				this.notifyListeners('disconnected', { connected: false })
				this.attemptReconnect(token)
			}
		} catch (error) {
			console.error('Error connecting WebSocket:', error)
		}
	}

	attemptReconnect(token) {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++
			console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`)

			setTimeout(() => {
				this.connect(token)
			}, this.reconnectDelay)
		} else {
			console.error('Max reconnection attempts reached')
		}
	}

	disconnect() {
		if (this.ws) {
			this.ws.close()
			this.ws = null
		}
		this.listeners.clear()
	}

	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, [])
		}
		this.listeners.get(event).push(callback)
	}
	authAPI
	off(event, callback) {
		if (this.listeners.has(event)) {
			const callbacks = this.listeners.get(event)
			const index = callbacks.indexOf(callback)
			if (index > -1) {
				callbacks.splice(index, 1)
			}
		}
	}

	notifyListeners(event, data) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach(callback => {
				try {
					callback(data)
				} catch (error) {
					console.error(`Error in listener for ${event}:`, error)
				}
			})
		}
	}

	send(data) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data))
		} else {
			console.error('WebSocket is not connected')
		}
	}
}

export default new WebSocketService()
authAPI
