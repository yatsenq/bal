import '../styles/Sidebar.css'

function Sidebar({ user, onNavigate, currentPage, onLogout }) {
	return (
		<div className='sidebar'>
			<div className='sidebar-header'>
				<div className='logo'>
					<div className='logo-icon'>LB</div>
					<span className='logo-text'>Load Balancer</span>
				</div>
			</div>

			<nav className='sidebar-nav'>
				<button
					className={`nav-item ${currentPage === 'tasks' ? 'active' : ''}`}
					onClick={() => (window.location.href = '/dashboard')}
				>
					<svg
						width='20'
						height='20'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
					>
						<path d='M9 11l3 3L22 4'></path>
						<path d='M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'></path>
					</svg>
					<span>Tasks</span>
				</button>

				{user?.role === 'admin' && (
					<button
						className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
						onClick={() => (window.location.href = '/admin')}
					>
						<svg
							width='20'
							height='20'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
						>
							<path d='M12 2L2 7l10 5 10-5-10-5z'></path>
							<path d='M2 17l10 5 10-5M2 12l10 5 10-5'></path>
						</svg>
						<span>Monitoring</span>
					</button>
				)}
			</nav>

			<div className='sidebar-footer'>
				<div className='user-profile'>
					<div className='user-avatar'>
						{user?.username?.charAt(0).toUpperCase()}
					</div>
					<div className='user-details'>
						<div className='user-name'>{user?.username}</div>
						<div className='user-role'>{user?.role}</div>
					</div>
				</div>
				<button className='logout-btn' onClick={onLogout}>
					<svg
						width='18'
						height='18'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
					>
						<path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9'></path>
					</svg>
					Logout
				</button>
			</div>
		</div>
	)
}

export default Sidebar
