import React, { useState } from 'react';
import '../styles/TaskList.css';

function TaskList({ tasks, onCancel }) {
  const [expandedTask, setExpandedTask] = useState(null);
  const [filter, setFilter] = useState('all');

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ Очікує', className: 'status-pending' },
      processing: { text: '⚙️ Обробка', className: 'status-processing' },
      completed: { text: '✅ Завершено', className: 'status-completed' },
      failed: { text: '❌ Помилка', className: 'status-failed' },
      cancelled: { text: '🚫 Скасовано', className: 'status-cancelled' },
    };
    return badges[status] || { text: status, className: '' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start, end) => {
    if (!end) return '-';
    const duration = new Date(end) - new Date(start);
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds} сек`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} хв ${seconds % 60} сек`;
  };

  const toggleExpand = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const handleCancel = (e, taskId, status) => {
    e.stopPropagation();
    if (status !== 'pending' && status !== 'processing') {
      alert('Можна скасувати тільки активні задачі');
      return;
    }
    if (window.confirm('Ви впевнені, що хочете скасувати цю задачу?')) {
      onCancel(taskId);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'active') return task.status === 'pending' || task.status === 'processing';
    return task.status === filter;
  });

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>Немає задач</h3>
        <p>Створіть нову задачу для початку роботи</p>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <h2>Ваші задачі</h2>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Всі ({tasks.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Активні ({tasks.filter(t => t.status === 'pending' || t.status === 'processing').length})
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Завершені ({tasks.filter(t => t.status === 'completed').length})
          </button>
          <button 
            className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            Помилки ({tasks.filter(t => t.status === 'failed').length})
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Немає задач</h3>
          <p>З фільтром "{filter}"</p>
        </div>
      ) : (
        <div className="task-grid">
          {filteredTasks.map(task => {
            const badge = getStatusBadge(task.status);
            const isExpanded = expandedTask === task.id;
            const canCancel = task.status === 'pending' || task.status === 'processing';

            return (
              <div 
                key={task.id} 
                className={`task-card ${badge.className}`}
                onClick={() => toggleExpand(task.id)}
              >
                <div className="task-card-header">
                  <div className="task-card-title">
                    <div className="task-number">
                      <span className="task-id-badge">#{task.id}</span>
                      Задача
                    </div>
                    <span className={`status-badge ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="task-card-meta">
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                      <span>{task.matrix_size}×{task.matrix_size}</span>
                    </div>
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{formatDate(task.created_at)}</span>
                    </div>
                  </div>
                </div>

                {task.status === 'processing' && (
                  <div className="task-card-body">
                    <div className="progress-section">
                      <div className="progress-label">
                        <span>Прогрес виконання</span>
                        <span className="progress-percentage">{task.progress}%</span>
                      </div>
                      <div className="progress-bar-wrapper">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="task-card-body">
                    <div className="task-details-section">
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">ID задачі</span>
                          <span className="detail-value">{task.id}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Розмір матриці</span>
                          <span className="detail-value">{task.matrix_size}×{task.matrix_size}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Створено</span>
                          <span className="detail-value">{formatDate(task.created_at)}</span>
                        </div>
                        {task.updated_at && (
                          <div className="detail-item">
                            <span className="detail-label">Оновлено</span>
                            <span className="detail-value">{formatDate(task.updated_at)}</span>
                          </div>
                        )}
                        {task.completed_at && (
                          <div className="detail-item">
                            <span className="detail-label">Завершено</span>
                            <span className="detail-value">{formatDate(task.completed_at)}</span>
                          </div>
                        )}
                        {task.completed_at && (
                          <div className="detail-item">
                            <span className="detail-label">Тривалість</span>
                            <span className="detail-value">{formatDuration(task.created_at, task.completed_at)}</span>
                          </div>
                        )}
                        {task.worker_id && (
                          <div className="detail-item">
                            <span className="detail-label">Worker</span>
                            <span className="detail-value">
                              <span className="worker-badge">{task.worker_id}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {task.status === 'completed' && task.result && (
                      <div className="result-preview">
                        <h4>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Результат обчислень
                        </h4>
                        <div className="result-info">
                          Матриця успішно обчислена. Результат містить {task.matrix_size * task.matrix_size} елементів.
                        </div>
                        <div className="result-stats">
                          <div className="stat-box">
                            <span className="stat-value">{task.matrix_size}×{task.matrix_size}</span>
                            <span className="stat-label">Розмір</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-value">{task.matrix_size * task.matrix_size}</span>
                            <span className="stat-label">Елементів</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {task.error_message && (
                      <div className="error-message-task">
                        <strong>Помилка:</strong> {task.error_message}
                      </div>
                    )}

                    {canCancel && (
                      <div className="task-actions">
                        <button
                          className="btn-cancel"
                          onClick={(e) => handleCancel(e, task.id, task.status)}
                        >
                          🚫 Скасувати задачу
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaskList;