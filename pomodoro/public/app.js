/**
 * 番茄钟应用主逻辑
 * 
 * 【P0-修复】使用 IIFE 封装，避免全局变量污染
 */
(function() {
'use strict';

// ========================================
// 常量定义 - 【P2-修复】魔法数字提取为常量
// ========================================

const CONSTANTS = {
    // 时间常量（毫秒）
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    
    // 默认时长（分钟）
    DEFAULT_POMODORO_DURATION: 25,
    DEFAULT_BREAK_DURATION: 5,
    
    // 动画相关
    CELEBRATION_DURATION: 4000,
    CONFETTI_COUNT: 50,
    NOTIFICATION_DURATION: 5000,
    
    // 进度环
    PROGRESS_RING_RADIUS: 140,
    
    // 存储 key
    STORAGE_KEYS: {
        TASK_POMODOROS: 'pomodoro_task_pomodoros',
        SETTINGS: 'pomodoro_settings',
        STATE: 'pomodoro_state',
        THEME: 'pomodoro_theme',
        FEISHU_TOKEN: 'feishu_user_token',
        PENDING_OPS: 'pendingOperations'
    }
};

// ========================================
// 自定义弹窗系统
// ========================================

class Dialog {
    constructor() {
        this.dialog = document.getElementById('customDialog');
        this.iconEl = document.getElementById('dialogIcon');
        this.titleEl = document.getElementById('dialog-title');
        this.messageEl = document.getElementById('dialogMessage');
        this.actionsEl = document.getElementById('dialogActions');
        this.resolveCallback = null;
        this.escHandler = null;
        
        // ESC 关闭
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.dialog.classList.contains('show')) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }
    
    // 【P0-修复】添加 destroy 方法，清理事件监听器
    destroy() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
        this.hide();
    }
    
    show({ type = 'info', title, message, buttons = [] }) {
        // 图标
        const icons = {
            info: '💡',
            warning: '⚠️',
            error: '❌',
            success: '✅',
            confirm: '❓'
        };
        this.iconEl.textContent = icons[type] || icons.info;
        
        // 标题和消息
        this.titleEl.textContent = title || '';
        this.messageEl.textContent = message || '';
        
        // 按钮
        this.actionsEl.innerHTML = '';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn ${btn.style || 'btn-secondary'}`;
            button.type = 'button';  // 【P1-修复】按钮添加 type 属性
            button.textContent = btn.text;
            button.onclick = () => {
                this.hide();
                if (btn.onClick) btn.onClick();
            };
            this.actionsEl.appendChild(button);
        });
        
        // 默认关闭按钮
        if (buttons.length === 0) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-primary';
            closeBtn.type = 'button';  // 【P1-修复】按钮添加 type 属性
            closeBtn.textContent = '确定';
            closeBtn.onclick = () => this.hide();
            this.actionsEl.appendChild(closeBtn);
        }
        
        this.dialog.classList.add('show');
        return new Promise(resolve => { this.resolveCallback = resolve; });
    }
    
    hide() {
        this.dialog.classList.remove('show');
        if (this.resolveCallback) {
            this.resolveCallback();
            this.resolveCallback = null;
        }
    }
    
    // 快捷方法
    alert(message, title = '提示') {
        return this.show({ type: 'info', title, message });
    }
    
    confirm(message, title = '确认') {
        return new Promise(resolve => {
            this.show({
                type: 'confirm',
                title,
                message,
                buttons: [
                    { text: '取消', style: 'btn-secondary', onClick: () => resolve(false) },
                    { text: '确定', style: 'btn-primary', onClick: () => resolve(true) }
                ]
            });
        });
    }
    
    error(message, title = '错误') {
        return this.show({ type: 'error', title, message });
    }
    
    success(message, title = '成功') {
        return this.show({ type: 'success', title, message });
    }
}

// ========================================
// 声音提醒系统（Web Audio API）
// ========================================

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }
    
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    // 播放完成提示音（三声清脆的叮咚）
    playComplete() {
        if (!this.enabled) return;
        this.init();
        
        const now = this.audioContext.currentTime;
        
        // 三个音符
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now + i * 0.15);
            
            gainNode.gain.setValueAtTime(0, now + i * 0.15);
            gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
            
            oscillator.start(now + i * 0.15);
            oscillator.stop(now + i * 0.15 + 0.4);
        });
    }
    
    // 播放休息结束提示音
    playBreakEnd() {
        if (!this.enabled) return;
        this.init();
        
        const now = this.audioContext.currentTime;
        
        // 两个下行音符
        const notes = [783.99, 523.25]; // G5, C5
        
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(freq, now + i * 0.2);
            
            gainNode.gain.setValueAtTime(0, now + i * 0.2);
            gainNode.gain.linearRampToValueAtTime(0.25, now + i * 0.2 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.5);
            
            oscillator.start(now + i * 0.2);
            oscillator.stop(now + i * 0.2 + 0.5);
        });
    }
    
    // 播放点击音效
    playClick() {
        if (!this.enabled) return;
        this.init();
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
}

// ========================================
// 庆祝动画系统
// ========================================

function createCelebration() {
    const container = document.getElementById('celebrationContainer');
    const colors = ['#FFD700', '#FFA500', '#FF8C00', '#FF6B35', '#E8A317', '#90EE90', '#32CD32'];
    
    for (let i = 0; i < CONSTANTS.CONFETTI_COUNT; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        
        // 随机形状
        if (Math.random() > 0.5) {
            confetti.style.borderRadius = '50%';
        } else {
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        }
        
        container.appendChild(confetti);
        
        // 动画结束后移除
        setTimeout(() => confetti.remove(), CONSTANTS.CELEBRATION_DURATION);
    }
}

// ========================================
// 深色模式管理
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem(CONSTANTS.STORAGE_KEYS.THEME) || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.THEME, newTheme);
    
    soundManager.playClick();
}

// ========================================
// 进度环动画
// ========================================

function updateProgressRing(progress) {
    const ring = document.querySelector('.progress-ring');
    if (!ring) return;
    
    const circumference = 2 * Math.PI * CONSTANTS.PROGRESS_RING_RADIUS;
    const offset = circumference * (1 - progress);
    
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
}

// ========================================
// 操作记录队列（用于同步到飞书）
// ========================================

let pendingOperations = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEYS.PENDING_OPS) || '[]');

function recordOperation(type, data) {
    const operation = {
        id: Date.now(),
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        synced: false
    };
    
    fetch('/api/pending-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, data: data })
    }).catch(err => {
        // 【P1-修复】错误处理 - 静默处理，不影响用户体验
    });
    
    return operation;
}

function markOperationSynced(operationId) {
    pendingOperations = pendingOperations.filter(op => op.id !== operationId);
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.PENDING_OPS, JSON.stringify(pendingOperations));
}

// ========================================
// 用户 Token 管理
// ========================================

let USER_TOKEN = null;

function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

function initToken() {
    const urlToken = getTokenFromURL();
    if (urlToken) {
        USER_TOKEN = urlToken;
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.FEISHU_TOKEN, urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        USER_TOKEN = localStorage.getItem(CONSTANTS.STORAGE_KEYS.FEISHU_TOKEN);
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const result = await response.json();
        return result.authorized;
    } catch (error) {
        return false;
    }
}

// ========================================
// 状态管理
// ========================================

const state = {
    tasks: [],
    currentTask: null,
    timerDuration: CONSTANTS.DEFAULT_POMODORO_DURATION * 60,
    breakDuration: CONSTANTS.DEFAULT_BREAK_DURATION * 60,
    timeRemaining: CONSTANTS.DEFAULT_POMODORO_DURATION * 60,
    isRunning: false,
    isBreak: false,
    timerInterval: null,
    startTime: null,
    todayPomodoros: 0,
    todayMinutes: 0,
    taskPomodoros: {},
    taskIdPomodoros: {},  // P2: 新增按任务ID统计
    weeklyStats: null,
    monthlyStats: null
};

// ========================================
// DOM 元素
// ========================================

const elements = {
    taskList: document.getElementById('taskList'),
    timerDisplay: document.getElementById('timerDisplay'),
    currentTaskName: document.getElementById('currentTaskName'),
    startBtn: document.getElementById('startBtn'),
    finishBtn: document.getElementById('finishBtn'),
    todayPomodoros: document.getElementById('todayPomodoros'),
    todayMinutes: document.getElementById('todayMinutes'),
    notification: document.getElementById('notification'),
    addTaskModal: document.getElementById('addTaskModal'),
    settingsModal: document.getElementById('settingsModal'),
    statsModal: document.getElementById('statsModal'),
    newTaskName: document.getElementById('newTaskName'),
    newTaskPomodoros: document.getElementById('newTaskPomodoros'),
    pomodoroDuration: document.getElementById('pomodoroDuration'),
    breakDuration: document.getElementById('breakDuration'),
    timerDurationDisplay: document.getElementById('timerDurationDisplay'),
    soundEnabled: document.getElementById('soundEnabled'),
    statsContent: document.getElementById('statsContent')
};

// ========================================
// 设置管理
// ========================================

function loadSettings() {
    try {
        const stored = localStorage.getItem(CONSTANTS.STORAGE_KEYS.SETTINGS);
        if (stored) {
            const settings = JSON.parse(stored);
            state.timerDuration = (settings.pomodoroDuration || CONSTANTS.DEFAULT_POMODORO_DURATION) * 60;
            state.breakDuration = (settings.breakDuration || CONSTANTS.DEFAULT_BREAK_DURATION) * 60;
            state.timeRemaining = state.timerDuration;
            soundManager.enabled = settings.soundEnabled !== false;
            
            if (elements.pomodoroDuration) {
                elements.pomodoroDuration.value = settings.pomodoroDuration || CONSTANTS.DEFAULT_POMODORO_DURATION;
            }
            if (elements.breakDuration) {
                elements.breakDuration.value = settings.breakDuration || CONSTANTS.DEFAULT_BREAK_DURATION;
            }
            if (elements.soundEnabled) {
                elements.soundEnabled.checked = soundManager.enabled;
            }
        }
    } catch (error) {
        // 【P1-修复】错误处理 - 静默处理
    }
    
    updateTimerDisplay();
    updateTimerDurationDisplay();
    updateProgressRing(1);
}

function saveSettingsToStorage() {
    try {
        const settings = {
            pomodoroDuration: state.timerDuration / 60,
            breakDuration: state.breakDuration / 60,
            soundEnabled: soundManager.enabled
        };
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
        // 【P1-修复】错误处理 - 静默处理
    }
}

function updateTimerDurationDisplay() {
    if (elements.timerDurationDisplay) {
        elements.timerDurationDisplay.textContent = state.timerDuration / 60;
    }
}

function showSettingsModal() {
    elements.settingsModal.classList.add('show');
}

function hideSettingsModal() {
    elements.settingsModal.classList.remove('show');
}

function saveSettings() {
    const pomodoro = parseInt(elements.pomodoroDuration.value);
    const breakTime = parseInt(elements.breakDuration.value);
    
    state.timerDuration = pomodoro * 60;
    state.breakDuration = breakTime * 60;
    state.timeRemaining = state.timerDuration;
    soundManager.enabled = elements.soundEnabled.checked;
    
    saveSettingsToStorage();
    updateTimerDisplay();
    updateTimerDurationDisplay();
    updateProgressRing(1);
    hideSettingsModal();
    
    soundManager.playClick();
}

// ========================================
// 统计报表
// ========================================

function showStatsModal() {
    elements.statsModal.classList.add('show');
    loadStats('week');
}

function hideStatsModal() {
    elements.statsModal.classList.remove('show');
}

function switchStatsTab(period) {
    document.querySelectorAll('.stats-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadStats(period);
}

async function loadStats(period) {
    const content = elements.statsContent;
    content.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        // 尝试从后端获取统计数据
        const response = await fetch(`/api/stats/${period}`);
        const result = await response.json();
        
        if (result.success) {
            renderStats(result.data, period);
        } else {
            // 如果后端没有数据，显示本地统计
            renderLocalStats(period);
        }
    } catch (error) {
        renderLocalStats(period);
    }
}

function renderLocalStats(period) {
    const today = new Date();
    let days = period === 'week' ? 7 : 30;
    
    // 使用今日真实数据 + 历史模拟数据（仅用于演示）
    // 注意：后端 API 会返回真实数据，这里只是备用方案
    const stats = {
        totalPomodoros: state.todayPomodoros,
        totalMinutes: state.todayMinutes,
        avgPomodoros: state.todayPomodoros > 0 ? state.todayPomodoros : 0,
        dailyData: []
    };
    
    // 生成每日数据（只有今天是真实数据）
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const isToday = i === 0;
        stats.dailyData.push({
            date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
            pomodoros: isToday ? state.todayPomodoros : 0,
            minutes: isToday ? state.todayMinutes : 0
        });
    }
    
    renderStats(stats, period);
}

function renderStats(stats, period) {
    const maxPomodoros = Math.max(...stats.dailyData.map(d => d.pomodoros), 1);
    
    // 计算总结数据
    const summary = stats.summary || {
        totalPomodoros: stats.totalPomodoros,
        totalMinutes: stats.totalMinutes,
        totalDays: stats.dailyData.filter(d => d.pomodoros > 0).length
    };
    
    const html = `
        <div class="stats-summary">
            <div class="stats-card">
                <div class="stats-card-value">${stats.totalPomodoros}</div>
                <div class="stats-card-label">${period === 'total' ? '累计番茄钟' : '总番茄钟'}</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${stats.totalMinutes}</div>
                <div class="stats-card-label">${period === 'total' ? '累计专注分钟' : '总专注分钟'}</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${stats.avgPomodoros}</div>
                <div class="stats-card-label">日均番茄钟</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-value">${Math.round(stats.totalMinutes / 60)}</div>
                <div class="stats-card-label">${period === 'total' ? '累计专注小时' : '总专注小时'}</div>
            </div>
        </div>
        ${period !== 'total' ? `
        <div class="stats-chart">
            <div class="chart-title">每日番茄钟趋势</div>
            <div class="chart-bars">
                ${stats.dailyData.map(d => `
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="height: ${(d.pomodoros / maxPomodoros) * 100}%" data-value="${d.pomodoros}"></div>
                        <div class="chart-label">${d.date}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div class="stats-summary" style="margin-top: 20px;">
            <div class="stats-card">
                <div class="stats-card-value">${summary.totalDays}</div>
                <div class="stats-card-label">累计专注天数</div>
            </div>
        </div>
        `}
    `;
    
    elements.statsContent.innerHTML = html;
}

// ========================================
// 数据加载
// ========================================

async function loadTaskPomodoros() {
    try {
        const response = await fetch('/api/stats/today');
        const result = await response.json();
        if (result.success) {
            state.todayPomodoros = result.data.pomodoros || 0;
            state.todayMinutes = result.data.minutes || 0;
            state.taskPomodoros = result.data.taskPomodoros || {};
            state.taskIdPomodoros = result.data.taskIdPomodoros || {};  // P2: 新增按ID统计
            updateStatsDisplay();
        }
    } catch (error) {
        // 【P1-修复】错误处理 - 静默处理
    }
}

async function saveTaskPomodoros() {
    try {
        await fetch('/api/stats/today', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pomodoros: state.todayPomodoros,
                minutes: state.todayMinutes,
                taskPomodoros: state.taskPomodoros
            })
        });
    } catch (error) {
        // 【P1-修复】错误处理 - 静默处理
    }
}

// 保存当前状态到 localStorage
function saveCurrentState() {
    const stateToSave = {
        currentTaskId: state.currentTask?.record_id || null,
        timeRemaining: state.timeRemaining,
        isRunning: state.isRunning,
        isBreak: state.isBreak,
        timerDuration: state.timerDuration,
        breakDuration: state.breakDuration,
        timestamp: Date.now()
    };
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.STATE, JSON.stringify(stateToSave));
}

// 从 localStorage 恢复状态
function restoreState() {
    try {
        const saved = localStorage.getItem(CONSTANTS.STORAGE_KEYS.STATE);
        if (!saved) return false;
        
        const stateData = JSON.parse(saved);
        
        // 检查是否是今天的数据（超过 24 小时丢弃）
        if (Date.now() - stateData.timestamp > CONSTANTS.DAY) {
            localStorage.removeItem(CONSTANTS.STORAGE_KEYS.STATE);
            return false;
        }
        
        // 恢复计时器状态
        state.timeRemaining = stateData.timeRemaining;
        state.timerDuration = stateData.timerDuration || CONSTANTS.DEFAULT_POMODORO_DURATION * 60;
        state.breakDuration = stateData.breakDuration || CONSTANTS.DEFAULT_BREAK_DURATION * 60;
        state.isBreak = stateData.isBreak || false;
        
        // 如果之前在运行，提示用户
        if (stateData.isRunning && stateData.currentTaskId) {
            // 恢复任务选中状态（需要等任务加载完成）
            setTimeout(() => {
                const task = state.tasks.find(t => t.record_id === stateData.currentTaskId);
                if (task && task.fields['状态'] !== '已完成') {
                    state.currentTask = task;
                    elements.currentTaskName.textContent = task.fields['任务安排'] || '未命名任务';
                    updateTimerDisplay();
                    updateProgress();
                    
                    dialog.confirm('检测到未完成的番茄钟，是否继续？').then(confirmed => {
                        if (confirmed) {
                            startTimer();
                        } else {
                            resetTimer();
                        }
                    });
                }
            }, 500);
        } else if (stateData.currentTaskId) {
            // 恢复任务选中状态
            setTimeout(() => {
                const task = state.tasks.find(t => t.record_id === stateData.currentTaskId);
                if (task && task.fields['状态'] !== '已完成') {
                    state.currentTask = task;
                    elements.currentTaskName.textContent = task.fields['任务安排'] || '未命名任务';
                    updateTimerDisplay();
                    updateProgress();
                    renderTasks();
                }
            }, 500);
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// ========================================
// 初始化
// ========================================

// 【P0-修复】全局 Dialog 实例
let dialog = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 【P0-修复】初始化 Dialog 实例
    dialog = new Dialog();
    
    initTheme();
    initToken();
    loadSettings();
    updateTodayDate();  // 更新今日日期
    await loadTaskPomodoros();
    await loadTasks();
    restoreState();  // 恢复上次状态
    requestNotificationPermission();
    
    // 页面关闭前保存状态
    window.addEventListener('beforeunload', saveCurrentState);
    
    // 【P0-修复】页面关闭前清理定时器
    window.addEventListener('beforeunload', cleanupTimers);
});

// 【P0-修复】清理定时器函数
function cleanupTimers() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTodayDate() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-CN', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
    });
    document.getElementById('todayDate').textContent = dateStr;
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ========================================
// 任务管理
// ========================================

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks/today');
        const result = await response.json();
        
        if (result.success) {
            state.tasks = result.data;
            renderTasks();
        } else {
            showError('加载任务失败: ' + result.error, 'loadTasks()');
        }
    } catch (error) {
        showError('加载任务失败，请检查网络连接', 'loadTasks()');
    }
}

function renderTasks() {
    if (state.tasks.length === 0) {
        elements.taskList.innerHTML = '<div class="loading">暂无今日任务，点击上方"添加任务"创建</div>';
        return;
    }
    
    elements.taskList.innerHTML = state.tasks.map(task => {
        const isActive = state.currentTask && state.currentTask.record_id === task.record_id;
        const isCompleted = task.fields['状态'] === '已完成';
        const isContinuation = task.fields['_isContinuation'];  // P3: 延续任务标记
        
        // P2: 优先使用任务ID匹配番茄钟数，fallback 到任务名称
        const taskId = task.record_id;
        const taskName = task.fields['任务安排'] || '未命名任务';
        const completedPomodoros = state.taskIdPomodoros?.[taskId] || state.taskPomodoros[taskName] || 0;
        const totalPomodoros = task.fields['预计耗时'] || 1;
        
        return `
            <div class="task-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
                 tabindex="${isCompleted ? '-1' : '0'}"
                 role="button"
                 aria-label="任务：${task.fields['任务安排'] || '未命名任务'}，${isCompleted ? '已完成' : `已完成 ${completedPomodoros}/${totalPomodoros} 个番茄钟`}"
                 onclick="PomodoroApp.selectTask('${task.record_id}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PomodoroApp.selectTask('${task.record_id}')}">
                <div class="task-header">
                    <span class="task-name">
                        ${isContinuation ? '<span class="continuation-badge" title="昨日未完成任务">📅</span>' : ''}
                        ${task.fields['任务安排'] || '未命名任务'}
                    </span>
                    <span class="task-pomodoros">
                        ${completedPomodoros}/${totalPomodoros}
                        <svg viewBox="0 0 100 100" width="14" height="14" aria-hidden="true">
                            <ellipse cx="50" cy="55" rx="35" ry="38" fill="#E8A317"/>
                            <ellipse cx="50" cy="55" rx="30" ry="33" fill="#FF6B35"/>
                            <path d="M50 17 Q55 10 52 5 Q50 8 48 5 Q45 10 50 17" fill="#228B22"/>
                        </svg>
                    </span>
                </div>
                <div class="task-meta">
                    <span>
                        <svg class="inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${task.fields['时间块'] || '未设置'}
                    </span>
                    <span>
                        <svg class="inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        ${task.fields['来源'] || '未分类'}
                    </span>
                </div>
                ${!isCompleted ? `
                <div class="task-actions" onclick="event.stopPropagation()">
                    <button type="button" class="btn-task btn-complete" onclick="PomodoroApp.completeTask('${task.record_id}')" aria-label="完成任务">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        完成
                    </button>
                    <button type="button" class="btn-task btn-delete" onclick="PomodoroApp.deleteTask('${task.record_id}')" aria-label="删除任务">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        删除
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function selectTask(recordId) {
    const task = state.tasks.find(t => t.record_id === recordId);
    if (!task) return;
    
    if (task.fields['状态'] === '已完成') {
        return;
    }
    
    // 休息时间禁止切换任务
    if (state.isBreak) {
        dialog.alert('休息时间请好好休息，不要切换任务哦~', '休息中');
        return;
    }
    
    if (state.isRunning && state.currentTask && state.currentTask.record_id !== recordId) {
        dialog.confirm('当前有正在进行的番茄钟，确定要切换任务吗？').then(confirmed => {
            if (confirmed) {
                resetTimer();
                doSelectTask(recordId);
            }
        });
        return;
    }
    
    doSelectTask(recordId);
}

function doSelectTask(recordId) {
    const task = state.tasks.find(t => t.record_id === recordId);
    if (!task) return;
    
    state.currentTask = task;
    elements.currentTaskName.textContent = task.fields['任务安排'] || '未命名任务';
    renderTasks();
    saveCurrentState();  // 保存状态
    
    soundManager.playClick();
}

// ========================================
// 计时器控制
// ========================================

function toggleTimer() {
    if (!state.currentTask) {
        dialog.alert('请先选择一个任务！', '提示');
        return;
    }
    
    if (state.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    state.isRunning = true;
    
    // 如果是恢复计时（不是新开始），保持原有的 startTime
    if (!state.startTime) {
        state.startTime = new Date();
    }
    
    elements.startBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        暂停
    `;
    elements.finishBtn.style.display = 'inline-flex';
    
    // 立即更新进度环
    updateProgress();
    
    soundManager.playClick();
    
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        updateProgress();
        
        if (state.timeRemaining <= 0) {
            completePomodoro();
        }
    }, CONSTANTS.SECOND);
}

function pauseTimer() {
    state.isRunning = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    
    elements.startBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        继续
    `;
    
    soundManager.playClick();
}

function resetTimer() {
    state.isRunning = false;
    state.isBreak = false;
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    state.timeRemaining = state.timerDuration;
    state.startTime = null;
    
    updateTimerDisplay();
    updateProgressRing(1);
    
    elements.startBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        开始
    `;
    elements.finishBtn.style.display = 'none';
}

function updateProgress() {
    const total = state.isBreak ? state.breakDuration : state.timerDuration;
    const progress = state.timeRemaining / total;
    updateProgressRing(progress);
}

function startBreak() {
    state.isBreak = true;
    state.isRunning = true;
    state.timeRemaining = state.breakDuration;
    state.startTime = new Date();
    
    elements.currentTaskName.textContent = '☕ 休息时间';
    elements.startBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        暂停
    `;
    elements.finishBtn.style.display = 'none';
    
    updateTimerDisplay();
    updateProgressRing(1);
    
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        updateProgress();
        
        if (state.timeRemaining <= 0) {
            endBreak();
        }
    }, CONSTANTS.SECOND);
}

function endBreak() {
    pauseTimer();
    state.isBreak = false;
    state.timeRemaining = state.timerDuration;
    
    soundManager.playBreakEnd();
    showBreakEndNotification();
    resetTimer();
    
    if (state.currentTask) {
        elements.currentTaskName.textContent = state.currentTask.fields['任务安排'] || '未命名任务';
    } else {
        elements.currentTaskName.textContent = '请选择任务';
    }
}

// ========================================
// 番茄钟完成 - 【P1-修复】拆分职责
// ========================================

/**
 * 【P1-修复】拆分 completePomodoro 函数职责
 * 原函数过长，拆分为多个子函数
 */

// 计算实际耗时
function calculateActualDuration() {
    const endTime = new Date();
    return Math.round((endTime - state.startTime) / 1000 / 60);
}

// 格式化时间范围
function formatTimeRange(startTime, endTime) {
    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);
    return `${startTimeStr}-${endTimeStr}`;
}

// 获取北京时间日期
function getBeijingDate() {
    const now = new Date();
    const beijingOffset = 8 * 60;
    const beijingTime = new Date(now.getTime() + beijingOffset * 60 * 1000);
    return beijingTime.toISOString().split('T')[0];
}

// 保存执行记录到后端
async function saveExecutionLog(timeRange, actualDuration) {
    const today = getBeijingDate();
    
    try {
        const response = await fetch('/api/execution-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: today,
                timeRange: timeRange,
                task: state.currentTask.fields['任务安排'],
                pomodoroCount: 1,
                actualDuration: actualDuration,
                taskId: state.currentTask.record_id
            })
        });
        
        const result = await response.json();
        if (result.success) {
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 更新番茄钟统计
function updatePomodoroStats(actualDuration) {
    const taskId = state.currentTask.record_id;
    const taskName = state.currentTask.fields['任务安排'] || '未命名任务';
    
    // 更新按ID统计
    if (!state.taskIdPomodoros) state.taskIdPomodoros = {};
    if (!state.taskIdPomodoros[taskId]) state.taskIdPomodoros[taskId] = 0;
    state.taskIdPomodoros[taskId]++;
    
    // 同时更新按名称统计（兼容）
    if (!state.taskPomodoros[taskName]) {
        state.taskPomodoros[taskName] = 0;
    }
    state.taskPomodoros[taskName]++;
    
    // 更新统计
    state.todayPomodoros++;
    state.todayMinutes += actualDuration;
    
    saveTaskPomodoros();
    updateStatsDisplay();
    renderTasks();
    showNotification();
}

// 主完成函数
async function completePomodoro() {
    pauseTimer();
    
    // 播放完成音效和庆祝动画
    soundManager.playComplete();
    createCelebration();
    
    // 计算实际耗时
    const endTime = new Date();
    const actualDuration = calculateActualDuration();
    const timeRange = formatTimeRange(state.startTime, endTime);
    
    // 保存执行记录
    const saveResult = await saveExecutionLog(timeRange, actualDuration);
    
    if (!saveResult.success) {
        // 【P1-修复】错误处理 - 添加用户提示
        const errorMsg = saveResult.error || '未知错误';
        dialog.error(`保存执行记录失败：${errorMsg}，请检查网络连接`);
        resetTimer();
        return;
    }
    
    // 更新统计
    updatePomodoroStats(actualDuration);
    
    resetTimer();
    
    // 询问是否开始休息
    setTimeout(async () => {
        const confirmed = await dialog.confirm('🍅 番茄钟完成！是否开始 5 分钟休息？');
        if (confirmed) {
            startBreak();
        }
    }, 500);
}

async function finishPomodoro() {
    if (!state.currentTask || !state.startTime) {
        dialog.alert('请先开始一个番茄钟！', '提示');
        return;
    }
    
    pauseTimer();
    
    const endTime = new Date();
    const actualDuration = calculateActualDuration();
    const timeRange = formatTimeRange(state.startTime, endTime);
    
    const saveResult = await saveExecutionLog(timeRange, actualDuration);
    
    if (!saveResult.success) {
        const errorMsg = saveResult.error || '未知错误';
        dialog.error(`保存执行记录失败：${errorMsg}`);
        resetTimer();
        return;
    }
    
    dialog.alert(`🍅 番茄钟已结束！\n专注时长：${actualDuration} 分钟`, '完成');
    
    // 更新统计
    updatePomodoroStats(actualDuration);
    
    resetTimer();
}

// ========================================
// 任务操作
// ========================================

async function completeTask(recordId) {
    const task = state.tasks.find(t => t.record_id === recordId);
    if (!task) return;
    
    const confirmed = await dialog.confirm(`确定要完成任务「${task.fields['任务安排']}」吗？`);
    if (!confirmed) return;
    
    soundManager.playClick();
    
    // 添加完成动画
    const taskElement = document.querySelector(`.task-item[onclick*="${recordId}"]`);
    if (taskElement) {
        taskElement.classList.add('completing');
    }
    
    const operation = recordOperation('complete_task', {
        recordId: recordId,
        taskName: task.fields['任务安排']
    });
    
    task.fields['状态'] = '已完成';
    
    if (state.currentTask && state.currentTask.record_id === recordId) {
        state.currentTask = null;
        elements.currentTaskName.textContent = '请选择任务';
        resetTimer();
    }
    
    // 延迟渲染以显示动画
    setTimeout(() => {
        renderTasks();
        // 播放庆祝动画
        createCelebration();
        soundManager.playComplete();
    }, 300);
    
    dialog.success(`任务「${task.fields['任务安排']}」已标记完成\n小助理会自动同步到飞书`, '完成');
    
    try {
        const response = await fetch('/api/tasks/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordId: recordId })
        });
        const result = await response.json();
        if (result.success) {
            markOperationSynced(operation.id);
        }
    } catch (error) {
        // 【P1-修复】错误处理 - 静默处理，后台同步
    }
}

async function deleteTask(recordId) {
    const task = state.tasks.find(t => t.record_id === recordId);
    if (!task) return;
    
    const confirmed = await dialog.confirm(`确定要删除任务「${task.fields['任务安排']}」吗？`, '删除确认');
    if (!confirmed) return;
    
    soundManager.playClick();
    
    // 先从前端移除
    state.tasks = state.tasks.filter(t => t.record_id !== recordId);
    
    if (state.currentTask && state.currentTask.record_id === recordId) {
        state.currentTask = null;
        elements.currentTaskName.textContent = '请选择任务';
        resetTimer();
    }
    
    renderTasks();
    
    // 同步删除到飞书
    try {
        const response = await fetch(`/api/tasks/${recordId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            dialog.success(`任务「${task.fields['任务安排']}」已删除`, '删除成功');
        } else {
            // 【P1-修复】错误处理 - 添加用户提示
            const errorMsg = result.error || '未知错误';
            dialog.error(`删除失败：${errorMsg}`);
            // 删除失败，重新加载任务列表
            await loadTasks();
        }
    } catch (error) {
        // 【P1-修复】错误处理 - 添加用户提示
        dialog.error('删除任务失败，请检查网络连接');
        // 删除失败，重新加载任务列表
        await loadTasks();
    }
}

// ========================================
// 添加任务
// ========================================

function showAddTaskModal() {
    elements.addTaskModal.classList.add('show');
    elements.newTaskName.value = '';
    elements.newTaskName.focus();
    soundManager.playClick();
}

function hideAddTaskModal() {
    elements.addTaskModal.classList.remove('show');
}

async function addTask() {
    const taskName = elements.newTaskName.value.trim();
    if (!taskName) {
        dialog.alert('请输入任务名称', '提示');
        return;
    }
    
    const pomodoros = parseInt(elements.newTaskPomodoros.value);
    
    soundManager.playClick();
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taskName: taskName,
                pomodoros: pomodoros
            })
        });
        
        const result = await response.json();
        if (result.success) {
            await loadTasks();
            hideAddTaskModal();
        } else {
            // 【P1-修复】错误处理 - 添加用户提示
            const errorMsg = result.error || '未知错误';
            dialog.error('添加任务失败: ' + errorMsg);
        }
    } catch (error) {
        // 【P1-修复】错误处理 - 添加用户提示
        dialog.error('添加任务失败，请重试');
    }
}

// ========================================
// 显示更新
// ========================================

function updateTimerDisplay() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    elements.timerDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新页面标题
    const icon = state.isBreak ? '☕' : '🍅';
    document.title = `${icon} ${elements.timerDisplay.textContent} - 番茄钟`;
}

function updateStatsDisplay() {
    elements.todayPomodoros.textContent = state.todayPomodoros;
    elements.todayMinutes.textContent = state.todayMinutes;
}

// ========================================
// 通知
// ========================================

function showNotification() {
    // 浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 番茄钟完成！', {
            body: '休息一下吧，喝杯水~',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="55" rx="35" ry="38" fill="%23E8A317"/><ellipse cx="50" cy="55" rx="30" ry="33" fill="%23FF6B35"/><path d="M50 17 Q55 10 52 5 Q50 8 48 5 Q45 10 50 17" fill="%23228B22"/></svg>'
        });
    }
    
    // 页面内通知
    elements.notification.classList.add('show');
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, CONSTANTS.NOTIFICATION_DURATION);
}

function showBreakEndNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('☕ 休息结束！', {
            body: '准备好继续工作了吗？',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23FFA500" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>'
        });
    }
    
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const text = notification.querySelector('.notification-text');
    
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>`;
    text.textContent = '休息结束！准备好继续工作了吗？';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`;
        text.textContent = '番茄钟完成！休息一下吧~';
    }, CONSTANTS.NOTIFICATION_DURATION);
}

// ========================================
// 工具函数
// ========================================

function formatTime(date) {
    return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function showError(message, retryCallback) {
    const retryHtml = retryCallback ? 
        `<button type="button" class="btn btn-primary btn-small" onclick="${retryCallback}" style="margin-top: 10px;">重试</button>` : '';
    elements.taskList.innerHTML = `
        <div class="loading" style="color: #e74c3c;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 10px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>${message}</div>
            ${retryHtml}
        </div>`;
}

// ========================================
// 键盘快捷键
// ========================================

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
    }
    if (e.code === 'KeyR') {
        resetTimer();
    }
    if (e.code === 'KeyF') {
        if (state.isRunning) {
            finishPomodoro();
        }
    }
    if (e.code === 'Escape') {
        hideAddTaskModal();
        hideSettingsModal();
        hideStatsModal();
    }
    if (e.code === 'KeyD') {
        toggleTheme();
    }
});

// ========================================
// 【P0-修复】导出公共 API 到全局（IIFE 封装后需要）
// ========================================

window.PomodoroApp = {
    selectTask,
    completeTask,
    deleteTask,
    toggleTimer,
    resetTimer,
    finishPomodoro,
    showAddTaskModal,
    hideAddTaskModal,
    addTask,
    showSettingsModal,
    hideSettingsModal,
    saveSettings,
    showStatsModal,
    hideStatsModal,
    switchStatsTab,
    toggleTheme
};

// 声音管理器实例
const soundManager = new SoundManager();

// 关闭 IIFE
})();
