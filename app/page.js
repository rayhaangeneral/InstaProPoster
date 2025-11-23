'use client';

import { useState, useEffect } from 'react';

export default function Home() {
    const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, published: 0, failed: 0 });
    const [videos, setVideos] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [bulkStartDate, setBulkStartDate] = useState('');
    const [bulkPostsPerDay, setBulkPostsPerDay] = useState(2);

    useEffect(() => {
        loadStats();
        loadJobs();
        const interval = setInterval(() => {
            loadStats();
            loadJobs();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        setBulkStartDate(tomorrow.toISOString().slice(0, 16));
    }, []);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const loadStats = async () => {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.success) setStats(data.stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadJobs = async () => {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            if (data.success) setJobs(data.jobs);
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    };

    const scanVideos = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/scan-videos');
            const data = await res.json();
            if (data.success) {
                setVideos(data.videos);
                showMessage('success', `Found ${data.count} videos from server`);
            } else {
                showMessage('error', data.error || 'Failed to scan videos');
            }
        } catch (error) {
            showMessage('error', 'Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleVideoSelection = (video) => {
        setSelectedVideos(prev => {
            const exists = prev.find(v => v.filename === video.filename);
            return exists ? prev.filter(v => v.filename !== video.filename) : [...prev, video];
        });
    };

    const selectAllVideos = () => setSelectedVideos(videos);
    const clearSelection = () => setSelectedVideos([]);

    const bulkSchedule = async () => {
        if (selectedVideos.length === 0) {
            showMessage('error', 'No videos selected');
            return;
        }
        if (!bulkStartDate) {
            showMessage('error', 'Please select a start date');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/schedule', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videos: selectedVideos,
                    startDate: bulkStartDate,
                    postsPerDay: bulkPostsPerDay
                })
            });

            const data = await res.json();
            if (data.success) {
                showMessage('success', `Scheduled ${data.scheduled} posts successfully!`);
                setSelectedVideos([]);
                await Promise.all([loadJobs(), loadStats()]);
            } else {
                showMessage('error', data.error || 'Failed to schedule posts');
            }
        } catch (error) {
            showMessage('error', 'Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const publishNow = async (jobId) => {
        if (!confirm('Publish this post immediately?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/publish-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId })
            });

            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Published successfully! Check your Instagram.');
                await Promise.all([loadJobs(), loadStats()]);
            } else {
                showMessage('error', data.error || 'Failed to publish');
            }
        } catch (error) {
            showMessage('error', 'Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteJob = async (jobId) => {
        if (!confirm('Delete this scheduled post?')) return;

        try {
            const res = await fetch(`/api/jobs?id=${jobId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Job deleted');
                await Promise.all([loadJobs(), loadStats()]);
            } else {
                showMessage('error', data.error || 'Failed to delete');
            }
        } catch (error) {
            showMessage('error', 'Network error: ' + error.message);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString();
    const getStatusBadge = (status) => <span className={`badge badge-${status}`}>{status}</span>;

    return (
        <div className="container">
            <div className="header">
                <h1>📸 Instagram Auto-Poster</h1>
                <p>Automated video posting system with smart scheduling</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Posts</div>
                    <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value">{stats.pending}</div>
                </div>
                <div className="stat-card processing">
                    <div className="stat-label">Processing</div>
                    <div className="stat-value">{stats.processing}</div>
                </div>
                <div className="stat-card published">
                    <div className="stat-label">Published</div>
                    <div className="stat-value">{stats.published}</div>
                </div>
                <div className="stat-card failed">
                    <div className="stat-label">Failed</div>
                    <div className="stat-value">{stats.failed}</div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">📹 Scan Videos</h2>
                    <button className="btn btn-primary" onClick={scanVideos} disabled={loading}>
                        {loading ? 'Scanning...' : '🔍 Scan Video Server'}
                    </button>
                </div>

                {videos.length > 0 && (
                    <>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, color: 'var(--text-secondary)' }}>
                                {selectedVideos.length} of {videos.length} selected
                            </div>
                            <button className="btn btn-secondary" onClick={selectAllVideos}>Select All</button>
                            <button className="btn btn-secondary" onClick={clearSelection}>Clear</button>
                        </div>

                        <div className="video-grid">
                            {videos.map(video => (
                                <div
                                    key={video.filename}
                                    className={`video-card ${selectedVideos.find(v => v.filename === video.filename) ? 'selected' : ''}`}
                                    onClick={() => toggleVideoSelection(video)}
                                >
                                    <div className="video-filename">{video.filename}</div>
                                    <div className="video-caption">
                                        {video.caption || '(no caption)'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {videos.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📹</div>
                        <div className="empty-state-title">No videos scanned yet</div>
                        <div className="empty-state-description">
                            Click the button above to scan your video server
                        </div>
                    </div>
                )}
            </div>

            {selectedVideos.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">📅 Bulk Schedule</h2>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={bulkStartDate}
                                onChange={(e) => setBulkStartDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Posts Per Day</label>
                            <select
                                className="form-select"
                                value={bulkPostsPerDay}
                                onChange={(e) => setBulkPostsPerDay(Number(e.target.value))}
                            >
                                <option value={1}>1 per day</option>
                                <option value={2}>2 per day</option>
                                <option value={3}>3 per day</option>
                                <option value={4}>4 per day</option>
                                <option value={6}>6 per day</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Will schedule {selectedVideos.length} videos over {Math.ceil(selectedVideos.length / bulkPostsPerDay)} days
                        <br />
                        {bulkPostsPerDay === 1 && '📅 Posts at 8 AM daily'}
                        {bulkPostsPerDay === 2 && '📅 Posts at 8 AM & 5 PM daily'}
                        {bulkPostsPerDay === 3 && '📅 Posts at 8 AM, 2 PM & 8 PM daily'}
                        {bulkPostsPerDay === 4 && '📅 Posts at 8 AM, 12 PM, 4 PM & 8 PM daily'}
                        {bulkPostsPerDay === 6 && '📅 Posts at 8 AM, 11 AM, 2 PM, 5 PM, 8 PM & 11 PM daily'}
                    </div>

                    <button className="btn btn-success" onClick={bulkSchedule} disabled={loading}>
                        {loading ? 'Scheduling...' : `📅 Schedule ${selectedVideos.length} Videos`}
                    </button>
                </div>
            )}

            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">📋 Scheduled Posts</h2>
                    <button className="btn btn-secondary" onClick={() => { loadJobs(); loadStats(); }}>
                        🔄 Refresh
                    </button>
                </div>

                {jobs.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Filename</th>
                                    <th>Scheduled For</th>
                                    <th>Status</th>
                                    <th>Caption</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job.id}>
                                        <td>{job.filename}</td>
                                        <td>{formatDate(job.scheduled_for)}</td>
                                        <td>{getStatusBadge(job.status)}</td>
                                        <td className="caption-cell">
                                            {job.caption ? job.caption.substring(0, 50) + '...' : '-'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {job.status === 'pending' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => publishNow(job.id)}>
                                                        Publish Now
                                                    </button>
                                                )}
                                                {job.status === 'published' && job.published_id && (
                                                    <a
                                                        href={`https://www.instagram.com/p/${job.published_id}/`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-secondary"
                                                    >
                                                        View on IG
                                                    </a>
                                                )}
                                                <button className="btn btn-sm btn-danger" onClick={() => deleteJob(job.id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No scheduled posts yet</div>
                        <div className="empty-state-description">
                            Scan and schedule some videos to get started
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
