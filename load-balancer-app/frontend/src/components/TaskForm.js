import { useState } from 'react'
import { tasksAPI } from '../services/api'
import '../styles/TaskForm.css'

function TaskForm({ onTaskCreated }) {
	const [size, setSize] = useState('3')
	const [matrix, setMatrix] = useState(generateMatrix(3))
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	function generateMatrix(n) {
		return Array(n)
			.fill(0)
			.map(() =>
				Array(n)
					.fill(0)
					.map(() => Math.floor(Math.random() * 20) - 10)
			)
	}

	const handleSizeChange = e => {
		const val = e.target.value
		setSize(val)
		const num = parseInt(val)

		if (!isNaN(num) && num >= 2 && num <= 10) {
			setMatrix(generateMatrix(num))
		}
	}

	const handleBlur = () => {
		const num = parseInt(size)

		if (isNaN(num) || num < 2) {
			setSize('2')
			setMatrix(generateMatrix(2))
		} else if (num > 2000) {
			setSize('2000')
			setMatrix([])
			setError('⚠️ Максимальний розмір: 2000×2000')
		} else if (num <= 10) {
			setMatrix(generateMatrix(num))
			setError('')
		} else {
			setMatrix([])
			setError('')
		}
	}

	const handleMatrixChange = (i, j, value) => {
		const newMatrix = [...matrix]
		newMatrix[i][j] = parseFloat(value) || 0
		setMatrix(newMatrix)
	}

	const handleRandomize = () => {
		const num = parseInt(size) || 2
		const validSize = Math.max(2, Math.min(1000, num))

		if (validSize <= 10) {
			setMatrix(generateMatrix(validSize))
		} else {
			alert('✅ Випадкові значення будуть згенеровані при створенні задачі')
		}
	}

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')
		setLoading(true)

		const num = parseInt(size)

		if (isNaN(num) || num < 2) {
			setError('Мінімальний розмір матриці: 2×2')
			setLoading(false)
			return
		}

		if (num > 2000) {
			setError('⚠️ Максимальний розмір матриці: 2000×2000')
			setLoading(false)
			return
		}

		const finalMatrix = num > 10 ? generateMatrix(num) : matrix

		try {
			const response = await tasksAPI.create(finalMatrix)

			const newTask = {
				id: response.data.taskId,
				status: 'pending',
				progress: 0,
				matrix_size: num,
				created_at: response.data.createdAt,
				input_data: { matrix },
			}

			onTaskCreated(newTask)

			alert(
				`✅ Задачу створено!\nМноження матриць ${num}×${num}\nID: ${response.data.taskId}`
			)
		} catch (err) {
			if (err.response?.status === 429) {
				const data = err.response.data
				setError(
					`⚠️ Досягнуто ліміт активних задач!\n\n` +
						`Активних задач: ${data.activeTasks}/${data.maxTasks}\n` +
						`Позиція в черзі: ${data.queuePosition}\n` +
						`Орієнтовний час очікування: ${data.estimatedWaitTime}\n\n` +
						data.message
				)
			} else {
				setError(err.response?.data?.error || 'Помилка створення задачі')
			}
		} finally {
			setLoading(false)
		}
	}

	const displaySize = parseInt(size) || 2

	return (
		<div className='task-form-container'>
			<h2>📝 Створення нової задачі</h2>
			<p className='form-description'>
				Система виконає множення матриць A × A (розмір {displaySize}×
				{displaySize})
			</p>

			<form onSubmit={handleSubmit} className='task-form'>
				<div className='form-row'>
					<div className='form-group'>
						<label htmlFor='size'>Розмір матриці (n×n):</label>
						<input
							type='text'
							id='size'
							value={size}
							onChange={handleSizeChange}
							onBlur={handleBlur}
							disabled={loading}
							placeholder='2-2000'
						/>
						<small>Від 2 до 2000</small>
					</div>
					<div className='form-actions'>
						<button
							type='button'
							onClick={handleRandomize}
							className='btn btn-secondary'
							disabled={loading}
						>
							🎲 Рандомні значення
						</button>
					</div>
				</div>

				{displaySize <= 10 && (
					<div className='matrix-section'>
						<h3>
							Матриця A ({displaySize}×{displaySize}):
						</h3>
						<div
							className='matrix-grid'
							style={{
								gridTemplateColumns: `repeat(${displaySize}, 1fr)`,
							}}
						>
							{matrix.map((row, i) =>
								row.map((value, j) => (
									<input
										key={`${i}-${j}`}
										type='number'
										step='0.1'
										value={value}
										onChange={e => handleMatrixChange(i, j, e.target.value)}
										disabled={loading}
										className='matrix-input'
									/>
								))
							)}
						</div>
					</div>
				)}

				{displaySize > 6 && (
					<div className='large-matrix-notice'>
						<p>
							<p>
								<strong>Використовуються випадкові значення.</strong>
							</p>
						</p>
					</div>
				)}

				{error && (
					<div className='error-message' style={{ whiteSpace: 'pre-line' }}>
						{error}
					</div>
				)}

				<button
					type='submit'
					className='btn btn-primary btn-large'
					disabled={loading}
				>
					{loading ? 'Створення...' : 'Створити завдання'}
				</button>
			</form>
		</div>
	)
}

export default TaskForm
