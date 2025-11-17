const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Queue = require('bull')
const WebSocket = require('ws')
const http = require('http')
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server, path: '/ws' })

const PORT = process.env.PORT || 3001
const WORKER_ID = process.env.WORKER_ID || 'worker-unknown'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const MAX_MATRIX_SIZE = 2000

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

const taskQueue = new Queue(
	'linear-equations',
	process.env.REDIS_URL || 'redis://127.0.0.1:6379',
	{
		defaultJobOptions: {
			attempts: 3,
			backoff: {
				type: 'exponential',
				delay: 2000,
			},
		},
	}
)

app.use(cors())
app.use(express.json({ limit: '200mb' }))

const wsClients = new Map()

wss.on('connection', (ws, req) => {
	const urlParams = new URLSearchParams(req.url.split('?')[1])
	const token = urlParams.get('token')

	if (!token) {
		ws.close(1008, 'Token required')
		return
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET)
		const userId = decoded.userId

		console.log(`[${WORKER_ID}] WebSocket connected: user ${userId}`)

		if (!wsClients.has(userId)) {
			wsClients.set(userId, [])
		}
		wsClients.get(userId).push(ws)

		ws.on('close', () => {
			console.log(`[${WORKER_ID}] WebSocket disconnected: user ${userId}`)
			const clients = wsClients.get(userId) || []
			const index = clients.indexOf(ws)
			if (index > -1) {
				clients.splice(index, 1)
			}
			if (clients.length === 0) {
				wsClients.delete(userId)
			}
		})

		ws.on('error', error => {
			console.error(`[${WORKER_ID}] WebSocket error:`, error)
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Invalid token:`, error.message)
		ws.close(1008, 'Invalid token')
	}
})

function sendToUser(userId, message) {
	const clients = wsClients.get(userId)
	if (clients && clients.length > 0) {
		const data = JSON.stringify(message)
		clients.forEach(ws => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data)
			}
		})
	}
}

function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]

	if (!token) {
		return res.status(401).json({ error: 'Access token required' })
	}

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ error: 'Invalid or expired token' })
		}
		req.user = user
		next()
	})
}

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/register', async (req, res) => {
	try {
		const { username, password } = req.body

		if (!username || !password) {
			return res.status(400).json({ error: 'Username and password required' })
		}

		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: 'Password must be at least 6 characters' })
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		const result = await pool.query(
			'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
			[username, hashedPassword, 'user']
		)

		console.log(`[${WORKER_ID}] New user registered: ${username}`)

		res.status(201).json({
			message: 'User registered successfully',
			user: result.rows[0],
		})
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'Username already exists' })
		}
		console.error(`[${WORKER_ID}] Registration error:`, error)
		res.status(500).json({ error: 'Registration failed' })
	}
})

app.post('/api/auth/login', async (req, res) => {
	try {
		const { username, password } = req.body

		if (!username || !password) {
			return res.status(400).json({ error: 'Username and password required' })
		}

		const result = await pool.query(
			'SELECT id, username, password_hash, role FROM users WHERE username = $1',
			[username]
		)

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const user = result.rows[0]
		const validPassword = await bcrypt.compare(password, user.password_hash)

		if (!validPassword) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const token = jwt.sign(
			{ userId: user.id, username: user.username, role: user.role },
			JWT_SECRET,
			{ expiresIn: '24h' }
		)

		console.log(`[${WORKER_ID}] User logged in: ${username}`)

		res.json({
			token,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
			},
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Login error:`, error)
		res.status(500).json({ error: 'Login failed' })
	}
})

// ==================== TASK ENDPOINTS ====================

app.post('/api/tasks', authenticateToken, async (req, res) => {
	try {
		const { matrix } = req.body
		const userId = req.user.userId

		if (!matrix || !Array.isArray(matrix)) {
			return res.status(400).json({ error: 'Invalid input data' })
		}

		const n = matrix.length

		if (n === 0 || n > MAX_MATRIX_SIZE) {
			return res.status(400).json({
				error: `Matrix size must be between 1 and ${MAX_MATRIX_SIZE}`,
			})
		}

		for (let row of matrix) {
			if (!Array.isArray(row) || row.length !== n) {
				return res.status(400).json({ error: 'Matrix must be square' })
			}
		}
		const activeCount = await taskQueue.getActiveCount()
		const waitingCount = await taskQueue.getWaitingCount()

		if (activeCount >= 10) {
			console.log(
				`[${WORKER_ID}] ⚠️ System at capacity! Active: ${activeCount}, Waiting: ${waitingCount}`
			)
		}

		const taskResult = await pool.query(
			`INSERT INTO tasks (user_id, status, input_data, matrix_size, worker_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
			[userId, 'pending', JSON.stringify({ matrix }), n, WORKER_ID]
		)

		const taskId = taskResult.rows[0].id

		const job = await taskQueue.add(
			{
				taskId,
				userId,
				matrix,
				workerId: WORKER_ID,
			},
			{
				jobId: `task-${taskId}`,
			}
		)

		const queueLength = await taskQueue.getWaitingCount()
		const estimatedWaitTime = Math.ceil((queueLength * 30) / 2)

		console.log(
			`[${WORKER_ID}] Task ${taskId} created for user ${userId}, size: ${n}x${n}, queue position: ${
				queueLength + 1
			}`
		)

		res.status(201).json({
			taskId,
			status: 'pending',
			message:
				queueLength > 0
					? `Task queued for processing. Position: ${
							queueLength + 1
					  }, estimated wait: ${estimatedWaitTime} seconds`
					: 'Task created and queued for processing',
			matrixSize: n,
			queuePosition: queueLength + 1,
			estimatedWaitTime: estimatedWaitTime,
			createdAt: taskResult.rows[0].created_at,
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Task creation error:`, error)
		res.status(500).json({ error: 'Failed to create task' })
	}
})

app.get('/api/tasks', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.userId
		const { status, limit = 50, offset = 0 } = req.query

		let query = 'SELECT * FROM tasks WHERE user_id = $1'
		const params = [userId]

		if (status) {
			query += ' AND status = $2'
			params.push(status)
		}

		query +=
			' ORDER BY created_at DESC LIMIT $' +
			(params.length + 1) +
			' OFFSET $' +
			(params.length + 2)
		params.push(parseInt(limit), parseInt(offset))

		const result = await pool.query(query, params)

		res.json(result.rows)
	} catch (error) {
		console.error(`[${WORKER_ID}] Get tasks error:`, error)
		res.status(500).json({ error: 'Failed to fetch tasks' })
	}
})

app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
	try {
		const taskId = req.params.id
		const userId = req.user.userId

		const result = await pool.query(
			'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
			[taskId, userId]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Task not found' })
		}

		res.json(result.rows[0])
	} catch (error) {
		console.error(`[${WORKER_ID}] Get task error:`, error)
		res.status(500).json({ error: 'Failed to fetch task' })
	}
})

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
	try {
		const taskId = req.params.id
		const userId = req.user.userId

		const result = await pool.query(
			'SELECT status FROM tasks WHERE id = $1 AND user_id = $2',
			[taskId, userId]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Task not found' })
		}

		const status = result.rows[0].status

		if (
			status === 'completed' ||
			status === 'failed' ||
			status === 'cancelled'
		) {
			return res
				.status(400)
				.json({ error: 'Cannot cancel task in current state' })
		}

		const job = await taskQueue.getJob(`task-${taskId}`)
		if (job) {
			await job.remove()
		}

		await pool.query(
			`UPDATE tasks 
       SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1`,
			[taskId]
		)

		console.log(`[${WORKER_ID}] Task ${taskId} cancelled by user ${userId}`)

		sendToUser(userId, {
			type: 'task_cancelled',
			taskId: parseInt(taskId),
		})

		res.json({ message: 'Task cancelled successfully' })
	} catch (error) {
		console.error(`[${WORKER_ID}] Cancel task error:`, error)
		res.status(500).json({ error: 'Failed to cancel task' })
	}
})

app.put('/api/tasks/:id/cancel', authenticateToken, async (req, res) => {
	const taskId = req.params.id
	const userId = req.user.userId

	try {
		const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [
			taskId,
		])

		if (taskResult.rows.length === 0) {
			return res.status(404).json({ error: 'Task not found' })
		}

		const task = taskResult.rows[0]

		if (task.status !== 'pending' && task.status !== 'processing') {
			return res.status(400).json({
				error: 'Can only cancel pending or processing tasks',
			})
		}

		const job = await taskQueue.getJob(`task-${taskId}`)
		if (job) {
			await job.remove()
		}

		await pool.query(
			`UPDATE tasks 
       SET status = 'cancelled', completed_at = NOW() 
       WHERE id = $1`,
			[taskId]
		)

		console.log(`[${WORKER_ID}] Task ${taskId} cancelled by user ${userId}`)

		sendToUser(userId, {
			type: 'task_cancelled',
			taskId: parseInt(taskId),
		})

		res.json({
			success: true,
			message: 'Task cancelled successfully',
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Cancel task error:`, error)
		res.status(500).json({ error: 'Failed to cancel task' })
	}
})

// ==================== ADMIN ENDPOINTS ====================

app.get('/api/admin/monitoring', authenticateToken, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ error: 'Admin access required' })
		}

		const tasksStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration
      FROM tasks
      GROUP BY status
    `)

		const workerStats = await pool.query(`
      SELECT 
        worker_id,
        COUNT(*) as active_tasks,
        AVG(progress) as avg_progress
      FROM tasks
      WHERE status = 'processing'
      GROUP BY worker_id
    `)

		const queueStats = {
			waiting: await taskQueue.getWaitingCount(),
			active: await taskQueue.getActiveCount(),
			completed: await taskQueue.getCompletedCount(),
			failed: await taskQueue.getFailedCount(),
		}

		res.json({
			workerId: WORKER_ID,
			tasks: tasksStats.rows,
			workers: workerStats.rows,
			queue: queueStats,
			timestamp: new Date().toISOString(),
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Monitoring error:`, error)
		res.status(500).json({ error: 'Failed to fetch monitoring data' })
	}
})

app.get('/api/admin/tasks', authenticateToken, async (req, res) => {
	try {
		if (req.user.role !== 'admin') {
			return res.status(403).json({ error: 'Admin access required' })
		}

		const { limit = 100, offset = 0 } = req.query

		const result = await pool.query(
			`SELECT t.*, u.username 
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
			[parseInt(limit), parseInt(offset)]
		)

		res.json({
			tasks: result.rows,
			count: result.rows.length,
		})
	} catch (error) {
		console.error(`[${WORKER_ID}] Admin tasks error:`, error)
		res.status(500).json({ error: 'Failed to fetch tasks' })
	}
})

// ==================== PROCESSING ====================

async function multiplyMatrices(matrixA, matrixB, taskId, userId) {
	const n = matrixA.length
	const C = Array(n)
		.fill(0)
		.map(() => Array(n).fill(0))

	try {
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				let sum = 0
				for (let k = 0; k < n; k++) {
					sum += matrixA[i][k] * matrixB[k][j]
				}
				C[i][j] = sum
			}

			const progress = Math.floor(((i + 1) / n) * 100)
			await updateTaskProgress(taskId, progress, userId)
			await new Promise(resolve => setTimeout(resolve, 200))
		}

		return C
	} catch (error) {
		throw error
	}
}

async function updateTaskProgress(taskId, progress, userId) {
	await pool.query(
		'UPDATE tasks SET progress = $1, updated_at = NOW() WHERE id = $2',
		[progress, taskId]
	)

	sendToUser(userId, {
		type: 'task_progress',
		taskId,
		progress,
	})

	console.log(`[${WORKER_ID}] Task ${taskId} progress: ${progress}%`)
}

taskQueue.process(5, async job => {
	const { taskId, userId, matrix } = job.data

	console.log(`[${WORKER_ID}] Processing task ${taskId}...`)

	try {
		await pool.query(
			'UPDATE tasks SET status = $1, worker_id = $2 WHERE id = $3',
			['processing', WORKER_ID, taskId]
		)

		sendToUser(userId, {
			type: 'task_started',
			taskId,
			workerId: WORKER_ID,
		})

		const result = await multiplyMatrices(matrix, matrix, taskId, userId)

		await pool.query(
			`UPDATE tasks 
       SET status = 'completed', result = $1, progress = 100, completed_at = NOW()
       WHERE id = $2`,
			[JSON.stringify({ result }), taskId]
		)

		console.log(`[${WORKER_ID}] Task ${taskId} completed successfully`)

		sendToUser(userId, {
			type: 'task_completed',
			taskId,
			result: { result },
		})

		return { success: true, result }
	} catch (error) {
		console.error(`[${WORKER_ID}] Task ${taskId} failed:`, error.message)

		await pool.query(
			`UPDATE tasks 
       SET status = 'failed', error_message = $1, completed_at = NOW()
       WHERE id = $2`,
			[error.message, taskId]
		)

		sendToUser(userId, {
			type: 'task_failed',
			taskId,
			error: error.message,
		})

		throw error
	}
})

taskQueue.on('failed', (job, err) => {
	console.error(`[${WORKER_ID}] Job ${job.id} failed:`, err.message)
})

taskQueue.on('completed', job => {
	console.log(`[${WORKER_ID}] Job ${job.id} completed`)
})

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
	res.json({
		status: 'healthy',
		workerId: WORKER_ID,
		timestamp: new Date().toISOString(),
	})
})

server.listen(PORT, () => {
	console.log(`\n====================================`)
	console.log(`🚀 Worker Server: ${WORKER_ID}`)
	console.log(`📡 HTTP: http://localhost:${PORT}`)
	console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`)
	console.log(`====================================\n`)
})

process.on('SIGTERM', async () => {
	console.log(`[${WORKER_ID}] SIGTERM received, shutting down gracefully...`)
	await taskQueue.close()
	await pool.end()
	server.close(() => {
		console.log(`[${WORKER_ID}] Server closed`)
		process.exit(0)
	})
})
