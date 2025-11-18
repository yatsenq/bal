import { useEffect, useState } from 'react'
import {
	Navigate,
	Route,
	BrowserRouter as Router,
	Routes,
} from 'react-router-dom'
import './App.css'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')

		if (token && userData) {
			try {
				setUser(JSON.parse(userData))
			} catch (error) {
				console.error('Error parsing user data:', error)
				localStorage.removeItem('token')
				localStorage.removeItem('user')
			}
		}
		setLoading(false)
	}, [])

	const handleLogin = (token, userData) => {
		localStorage.setItem('token', token)
		localStorage.setItem('user', JSON.stringify(userData))
		setUser(userData)
	}

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		setUser(null)
	}

	if (loading) {
		return (
			<div className='loading-container'>
				<div className='spinner'></div>
				<p>Завантаження...</p>
			</div>
		)
	}

	return (
		<Router>
			<div className='App'>
				<Routes>
					<Route
						path='/login'
						element={
							user ? (
								<Navigate to='/dashboard' />
							) : (
								<LoginPage onLogin={handleLogin} />
							)
						}
					/>
					<Route
						path='/register'
						element={user ? <Navigate to='/dashboard' /> : <RegisterPage />}
					/>
					<Route
						path='/dashboard'
						element={
							user ? (
								<DashboardPage user={user} onLogout={handleLogout} />
							) : (
								<Navigate to='/login' />
							)
						}
					/>
					<Route
						path='/admin'
						element={
							user && user.role === 'admin' ? (
								<AdminPage user={user} onLogout={handleLogout} />
							) : (
								<Navigate to='/login' />
							)
						}
					/>
					<Route path='/' element={<Navigate to='/dashboard' />} />
				</Routes>
			</div>
		</Router>
	)
}

export default App
