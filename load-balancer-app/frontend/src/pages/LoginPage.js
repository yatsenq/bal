import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import '../styles/Auth.css'

function LoginPage({ onLogin }) {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const response = await authAPI.login(username, password)
			onLogin(response.data.token, response.data.user)
		} catch (err) {
			setError(err.response?.data?.error || 'Помилка входу')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h1>🔐 Вхід до системи</h1>
				<p className='auth-subtitle'>Множення матриць</p>

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
							placeholder='Введіть пароль'
						/>
					</div>

					{error && <div className='error-message'>{error}</div>}

					<button type='submit' className='btn btn-primary' disabled={loading}>
						{loading ? 'Вхід...' : 'Увійти'}
					</button>
				</form>

				<p className='auth-link'>
					Немає акаунту? <Link to='/register'>Зареєструватися</Link>
				</p>
			</div>
		</div>
	)
}

export default LoginPage
