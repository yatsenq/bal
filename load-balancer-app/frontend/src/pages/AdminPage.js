import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import SystemStatsCard from '../components/SystemStatsCard'
import { adminAPI } from '../services/api'
import '../styles/AdminPage.css'

function AdminPage({ user, onLogout }) {
	const [systemStats, setSystemStats] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		loadSystemStats()
		const interval = setInterval(loadSystemStats, 5000) // Оновлення кожні 5 сек
		return () => clearInterval(interval)
	}, [])

	const loadSystemStats = async () => {
		try {
			const response = await adminAPI.getSystemStats()
			setSystemStats(response.data)
			setError('')
		} catch (err) {
			setError('Failed to load system stats')
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const formatBytes = bytes => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
	}

	const formatUptime = seconds => {
		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		return `${hours}h ${minutes}m`
	}

	if (loading && !systemStats) {
		return (
			<div className='dashboard-layout'>
				<Sidebar user={user} onLogout={onLogout} currentPage='admin' />
				<div className='main-content'>
					<div className='loading-container'>
						<div className='spinner'></div>
						<p>Loading system stats...</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='dashboard-layout'>
			<Sidebar user={user} onLogout={onLogout} currentPage='admin' />

			<div className='main-content'>
				<div className='content-header'>
					<div>
						<h1 className='page-title'>System Monitoring</h1>
						<p className='page-subtitle'>
							Real-time server statistics and performance metrics
						</p>
					</div>
					<button
						onClick={loadSystemStats}
						className='btn btn-secondary'
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh Now'}
					</button>
				</div>

				{error && <div className='error-message'>{error}</div>}

				{systemStats && (
					<>
						{/* System Info */}
						<div className='stats-grid'>
							<SystemStatsCard
								title='System Resources'
								icon='💻'
								stats={[
									{ label: 'Worker ID', value: systemStats.system.workerId },
									{ label: 'CPUs', value: systemStats.system.cpus },
									{
										label: 'Total RAM',
										value: formatBytes(systemStats.system.totalMemory),
									},
									{
										label: 'Used RAM',
										value: formatBytes(systemStats.system.usedMemory),
									},
									{
										label: 'RAM Usage',
										value: `${systemStats.system.memoryUsagePercent}%`,
									},
									{
										label: 'Uptime',
										value: formatUptime(systemStats.system.uptime),
									},
									{ label: 'Node.js', value: systemStats.system.nodeVersion },
								]}
							/>

							<SystemStatsCard
								title='Bull Queue'
								icon='📋'
								stats={[
									{ label: 'Waiting', value: systemStats.queue.waiting },
									{ label: 'Active', value: systemStats.queue.active },
									{ label: 'Completed', value: systemStats.queue.completed },
									{ label: 'Failed', value: systemStats.queue.failed },
									{ label: 'Delayed', value: systemStats.queue.delayed },
									{ label: 'Paused', value: systemStats.queue.paused },
								]}
							/>

							<SystemStatsCard
								title='WebSocket Connections'
								icon='🔌'
								stats={[
									{
										label: 'Total Connections',
										value: systemStats.websockets.totalConnections,
									},
									{
										label: 'Unique Users',
										value: systemStats.websockets.uniqueUsers,
									},
									{ label: 'Worker', value: systemStats.websockets.workerId },
								]}
							/>

							{systemStats.nginx && (
								<SystemStatsCard
									title='Nginx Load Balancer'
									icon='⚖️'
									stats={[
										{
											label: 'Active Connections',
											value: systemStats.nginx.activeConnections,
										},
										{
											label: 'Total Requests',
											value: systemStats.nginx.requests,
										},
										{ label: 'Accepts', value: systemStats.nginx.accepts },
										{ label: 'Handled', value: systemStats.nginx.handled },
										{ label: 'Reading', value: systemStats.nginx.reading },
										{ label: 'Writing', value: systemStats.nginx.writing },
										{ label: 'Waiting', value: systemStats.nginx.waiting },
									]}
								/>
							)}
						</div>

						{/* Tasks by Status */}
						<div className='section'>
							<h2 className='section-title'>Tasks by Status</h2>
							<div className='table-container'>
								<table className='data-table'>
									<thead>
										<tr>
											<th>Status</th>
											<th>Count</th>
											<th>Avg Matrix Size</th>
											<th>Last Created</th>
										</tr>
									</thead>
									<tbody>
										{systemStats.tasks.map((task, index) => (
											<tr key={index}>
												<td>
													<span
														className={`status-badge status-${task.status}`}
													>
														{task.status}
													</span>
												</td>
												<td>{task.count}</td>
												<td>
													{task.avg_size ? Math.round(task.avg_size) : 'N/A'}
												</td>
												<td>
													{task.last_created
														? new Date(task.last_created).toLocaleString()
														: 'N/A'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Workers Performance */}
						<div className='section'>
							<h2 className='section-title'>Worker Performance</h2>
							<div className='table-container'>
								<table className='data-table'>
									<thead>
										<tr>
											<th>Worker ID</th>
											<th>Total Tasks</th>
											<th>Active</th>
											<th>Completed</th>
											<th>Failed</th>
											<th>Avg Completion Time</th>
										</tr>
									</thead>
									<tbody>
										{systemStats.workers.map((worker, index) => (
											<tr key={index}>
												<td>
													<strong>{worker.worker_id}</strong>
												</td>
												<td>{worker.total_tasks}</td>
												<td>{worker.active_tasks}</td>
												<td>{worker.completed_tasks}</td>
												<td>{worker.failed_tasks}</td>
												<td>
													{worker.avg_completion_time
														? `${Math.round(worker.avg_completion_time)}s`
														: 'N/A'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Recent Errors */}
						{systemStats.recentErrors.length > 0 && (
							<div className='section'>
								<h2 className='section-title'>Recent Errors</h2>
								<div className='table-container'>
									<table className='data-table'>
										<thead>
											<tr>
												<th>Task ID</th>
												<th>User ID</th>
												<th>Error Message</th>
												<th>Failed At</th>
											</tr>
										</thead>
										<tbody>
											{systemStats.recentErrors.map(error => (
												<tr key={error.id}>
													<td>{error.id}</td>
													<td>{error.user_id}</td>
													<td className='error-text'>{error.error_message}</td>
													<td>{new Date(error.updated_at).toLocaleString()}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}

export default AdminPage
