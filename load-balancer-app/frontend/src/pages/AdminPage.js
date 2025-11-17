import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { adminAPI } from '../services/api'
import '../styles/AdminPage.css'

function AdminPage({ user, onLogout }) {
	const [monitoring, setMonitoring] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [currentPage, setCurrentPage] = useState('admin')

	useEffect(() => {
		loadMonitoring()
		const interval = setInterval(loadMonitoring, 5000)
		return () => clearInterval(interval)
	}, [])

	const loadMonitoring = async () => {
		setLoading(true)
		try {
			const response = await adminAPI.getMonitoring()
			setMonitoring(response.data)
			setError('')
		} catch (err) {
			setError('Failed to load monitoring data')
		} finally {
			setLoading(false)
		}
	}

	const handleNavigate = page => {
		if (page === 'tasks') {
			window.location.href = '/dashboard'
		} else {
			setCurrentPage(page)
		}
	}

	if (!monitoring && loading) {
		return (
			<div className='dashboard-layout'>
				<Sidebar
					user={user}
					onNavigate={handleNavigate}
					currentPage={currentPage}
					onLogout={onLogout}
				/>
				<div className='main-content'>
					<div className='loading-container'>
						<div className='spinner'></div>
						<p>Loading monitoring data...</p>
					</div>
				</div>
			</div>
		)
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
						<h1 className='page-title'>System Monitoring</h1>
						<p className='page-subtitle'>
							Real-time system performance and statistics
						</p>
					</div>
					<button
						onClick={loadMonitoring}
						className='btn btn-secondary'
						disabled={loading}
					>
						Refresh
					</button>
				</div>

				{error && <div className='error-message'>{error}</div>}

				{monitoring && (
					<div className='monitoring-grid'>
						{/* Queue Stats */}
						<div className='stat-card'>
							<div className='stat-header'>
								<h3>Queue Status</h3>
								<div className='stat-icon queue'>Q</div>
							</div>
							<div className='stat-body'>
								<div className='stat-item'>
									<span className='stat-label'>Waiting</span>
									<span className='stat-value'>{monitoring.queue.waiting}</span>
								</div>
								<div className='stat-item'>
									<span className='stat-label'>Active</span>
									<span className='stat-value active'>
										{monitoring.queue.active}
									</span>
								</div>
								<div className='stat-item'>
									<span className='stat-label'>Completed</span>
									<span className='stat-value completed'>
										{monitoring.queue.completed}
									</span>
								</div>
								<div className='stat-item'>
									<span className='stat-label'>Failed</span>
									<span className='stat-value failed'>
										{monitoring.queue.failed}
									</span>
								</div>
							</div>
						</div>

						{/* Tasks Stats */}
						<div className='stat-card'>
							<div className='stat-header'>
								<h3>Tasks by Status</h3>
								<div className='stat-icon tasks'>T</div>
							</div>
							<div className='stat-body'>
								{monitoring.tasks.map(stat => (
									<div key={stat.status} className='stat-item'>
										<span className='stat-label'>{stat.status}</span>
										<span className={`stat-value ${stat.status}`}>
											{stat.count}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Workers Stats */}
						<div className='stat-card wide'>
							<div className='stat-header'>
								<h3>Active Workers</h3>
								<div className='stat-icon workers'>W</div>
							</div>
							<div className='stat-body'>
								{monitoring.workers.length === 0 ? (
									<p className='no-data'>No active workers</p>
								) : (
									monitoring.workers.map(worker => (
										<div key={worker.worker_id} className='worker-item'>
											<div className='worker-info'>
												<span className='worker-name'>{worker.worker_id}</span>
												<span className='worker-tasks'>
													{worker.active_tasks} active tasks
												</span>
											</div>
											<div className='worker-progress'>
												<div className='progress-bar-wrapper'>
													<div
														className='progress-bar-fill'
														style={{
															width: `${Math.round(worker.avg_progress || 0)}%`,
														}}
													></div>
												</div>
												<span className='progress-text'>
													{Math.round(worker.avg_progress || 0)}%
												</span>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default AdminPage
