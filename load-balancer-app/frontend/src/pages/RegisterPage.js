import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import '../styles/Auth.css'

function RegisterPage() {
	const navigate = useNavigate()
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')

		if (password !== confirmPassword) {
			setError('Паролі не співпадають')
			return
		}

		if (password.length < 6) {
			setError('Пароль повинен містити мінімум 6 символів')
			return
		}

		setLoading(true)

		try {
			await authAPI.register(username, password)
			alert('✅ Реєстрація успішна! Тепер ви можете увійти.')
			navigate('/login')
		} catch (err) {
			setError(err.response?.data?.error || 'Помилка реєстрації')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h1>📝 Реєстрація</h1>
				<p className='auth-subtitle'>Створіть новий акаунт</p>

				<form onSubmit={handleSubmit} className='auth-form'>
					<div className='form-group'>
						<label htmlFor='username'>Ім'я користувача</label>
						<input
							type='text'
							id='username'
							value={username}
							onChange={e => setUsername(e.target.value)}
							required
							disabled={loading}
							placeholder="Введіть ім'я користувача"
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='password'>Пароль</label>
						<input
							type='password'
							id='password'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							disabled={loading}
							placeholder='Мінімум 6 символів'
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='confirmPassword'>Підтвердження паролю</label>
						<input
							type='password'
							id='confirmPassword'
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							required
							disabled={loading}
							placeholder='Повторіть пароль'
						/>
					</div>

					{error && <div className='error-message'>{error}</div>}

					<button type='submit' className='btn btn-primary' disabled={loading}>
						{loading ? 'Реєстрація...' : 'Зареєструватися'}
					</button>
				</form>

				<p className='auth-link'>
					Вже є акаунт? <Link to='/login'>Увійти</Link>
				</p>
			</div>
		</div>
	)
}

export default RegisterPage
