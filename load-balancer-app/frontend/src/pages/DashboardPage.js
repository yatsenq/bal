import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { tasksAPI, WS_URL } from '../services/api'
import '../styles/DashboardPage.css'

function DashboardPage({ user, onLogout }) {
	const [tasks, setTasks] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [showForm, setShowForm] = useState(false)
	const [currentPage, setCurrentPage] = useState('tasks')
	const [ws, setWs] = useState(null)

	useEffect(() => {
		loadTasks()
		connectWebSocket()

		return () => {
			if (ws) {
				ws.close()
			}
		}
	}, [])

	const connectWebSocket = () => {
		const token = localStorage.getItem('token')
		const wsUrl = `${WS_URL}?token=${token}`
		const websocket = new WebSocket(wsUrl)

		websocket.onopen = () => {
			console.log('WebSocket connected')
		}

		websocket.onmessage = event => {
			try {
				const data = JSON.parse(event.data)
				handleWebSocketMessage(data)
			} catch (err) {
				console.error('WebSocket message error:', err)
			}
		}

		websocket.onerror = error => {
			console.error('WebSocket error:', error)
		}

		websocket.onclose = () => {
			console.log('WebSocket disconnected')
			setTimeout(connectWebSocket, 3000)
		}

		setWs(websocket)
	}

	const handleWebSocketMessage = data => {
		if (data.type === 'task_progress') {
			updateTaskProgress(data.taskId, data.progress)
		} else if (data.type === 'task_completed') {
			updateTaskStatus(data.taskId, 'completed', data.result)
		} else if (data.type === 'task_failed') {
			updateTaskStatus(data.taskId, 'failed', { error: data.error })
		}
	}

	const updateTaskProgress = (taskId, progress) => {
		setTasks(prevTasks =>
			prevTasks.map(task => (task.id === taskId ? { ...task, progress } : task))
		)
	}

	const updateTaskStatus = (taskId, status, additionalData = {}) => {
		setTasks(prevTasks =>
			prevTasks.map(task =>
				task.id === taskId
					? {
							...task,
							status,
							...additionalData,
							completed_at: new Date().toISOString(),
					  }
					: task
			)
		)
	}

	const loadTasks = async () => {
		setLoading(true)
		setError('')
		try {
			const response = await tasksAPI.getAll({ limit: 50 })
			setTasks(response.data)
		} catch (err) {
			setError('Failed to load tasks')
		} finally {
			setLoading(false)
		}
	}

	const handleTaskCreated = newTask => {
		setTasks(prevTasks => [newTask, ...prevTasks])
		setShowForm(false)
	}

	const handleTaskCancelled = async taskId => {
		try {
			await tasksAPI.cancel(taskId)
			updateTaskStatus(taskId, 'cancelled', {})
		} catch (err) {
			alert(
				'Error cancelling task: ' + (err.response?.data?.error || err.message)
			)
		}
	}

	const handleNavigate = page => {
		if (page === 'admin') {
			window.location.href = '/admin'
		} else {
			setCurrentPage(page)
		}
	}

	return (
		<div className='dashboard-layout'>
			<Sidebar
				user={user}
				onNavigate={handleNavigate}
				currentPage={currentPage}
				onLogout={onLogout}
			/>

			<div className='main-content'>
				<div className='content-header'>
					<div>
						<h1 className='page-title'>Task Management</h1>
						<p className='page-subtitle'>
							Create and monitor computational tasks
						</p>
					</div>
					<div className='header-actions'>
						<button
							onClick={() => setShowForm(!showForm)}
							className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
						>
							{showForm ? 'Cancel' : 'New Task'}
						</button>
						<button
							onClick={loadTasks}
							className='btn btn-secondary'
							disabled={loading}
						>
							Refresh
						</button>
					</div>
				</div>

				{showForm && <TaskForm onTaskCreated={handleTaskCreated} />}

				{error && <div className='error-message'>{error}</div>}

				{loading && tasks.length === 0 ? (
					<div className='loading-container'>
						<div className='spinner'></div>
						<p>Loading tasks...</p>
					</div>
				) : (
					<TaskList tasks={tasks} onCancel={handleTaskCancelled} />
				)}
			</div>
		</div>
	)
}

export default DashboardPage
