function SystemStatsCard({ title, stats, icon }) {
	return (
		<div className='stats-card'>
			<div className='stats-header'>
				<span className='stats-icon'>{icon}</span>
				<h3>{title}</h3>
			</div>
			<div className='stats-content'>
				{stats.map((stat, index) => (
					<div key={index} className='stat-item'>
						<span className='stat-label'>{stat.label}:</span>
						<span className='stat-value'>{stat.value}</span>
					</div>
				))}
			</div>
		</div>
	)
}

export default SystemStatsCard
