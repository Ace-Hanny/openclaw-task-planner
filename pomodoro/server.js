const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// 加载配置文件
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️ 配置文件加载失败，请检查 config.json');
}

// 全局错误处理，防止进程崩溃
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});

const app = express();
const PORT = config.port || 9998;

// Token 持久化文件路径
const TOKEN_FILE = path.join(__dirname, '.token-cache.json');
const OPERATIONS_FILE = path.join(__dirname, '.pending-operations.json');
const STATS_FILE = path.join(__dirname, '.today-stats.json');

// 今日统计数据
let todayStats = {
  date: new Date().toISOString().split('T')[0],
  pomodoros: 0,
  minutes: 0,
  taskPomodoros: {}
};

// 飞书配置（从 config.json 读取）
const FEISHU_CONFIG = {
  appToken: config.feishu?.appToken || '',
  dailyPlanTableId: config.feishu?.dailyPlanTableId || '',
  executionLogTableId: config.feishu?.executionLogTableId || '',
  userOpenId: config.feishu?.userOpenId || ''
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 飞书应用凭证（从 config.json 读取）
const FEISHU_CREDENTIALS = {
  appId: config.feishu?.appId || '',
  appSecret: config.feishu?.appSecret || ''
};

// 用户 Token 缓存
let userTokenCache = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0
};

// Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

// 从文件加载 Token
function loadTokenFromFile() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (data.expiresAt > Date.now()) {
        tokenCache = data;
        console.log('✅ 从文件加载 Token，有效期至:', new Date(tokenCache.expiresAt).toLocaleString('zh-CN'));
        return true;
      }
    }
  } catch (error) {
    console.log('⚠️ 加载 Token 文件失败:', error.message);
  }
  return false;
}

// 保存 Token 到文件
function saveTokenToFile() {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenCache, null, 2));
  } catch (error) {
    console.log('⚠️ 保存 Token 文件失败:', error.message);
  }
}

// 获取飞书 tenant_access_token
async function getTenantAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 10 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_CREDENTIALS.appId,
        app_secret: FEISHU_CREDENTIALS.appSecret
      })
    });

    const data = await response.json();
    if (data.code === 0) {
      tokenCache.accessToken = data.tenant_access_token;
      tokenCache.expiresAt = now + data.expire * 1000;
      saveTokenToFile();
      console.log('✅ 获取 Token 成功，有效期至:', new Date(tokenCache.expiresAt).toLocaleString('zh-CN'));
      return data.tenant_access_token;
    } else {
      console.error('❌ 获取 Token 失败:', data.msg);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取 Token 异常:', error.message);
    return null;
  }
}

// 获取访问令牌（优先使用用户令牌）
async function getAccessToken() {
  // 尝试使用用户令牌
  if (userTokenCache.accessToken && userTokenCache.expiresAt > Date.now()) {
    return userTokenCache.accessToken;
  }
  
  // 降级到应用令牌
  return await getTenantAccessToken();
}

// API: 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: 获取今日任务
app.get('/api/tasks/today', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.dailyPlanTableId}/records`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const data = await response.json();
    
    if (data.code !== 0) {
      return res.status(500).json({ success: false, error: data.msg });
    }

    // 过滤今天的任务
    const todayTasks = (data.data?.items || []).filter(item => {
      const planDate = item.fields['计划日期'];
      return planDate === today;
    });

    // 加载延续任务
    const continuationTasks = (data.data?.items || []).filter(item => {
      const planDate = item.fields['计划日期'];
      const status = item.fields['状态'];
      return planDate && planDate < today && status === '待执行';
    });

    continuationTasks.forEach(task => {
      task.fields['_isContinuation'] = true;
    });

    const allTasks = [...todayTasks, ...continuationTasks];

    // 按时间块排序
    allTasks.sort((a, b) => {
      const timeA = a.fields['时间块'] || '';
      const timeB = b.fields['时间块'] || '';
      
      const getStartTime = (timeStr) => {
        if (!timeStr) return '99:99';
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        }
        if (timeStr.includes('早')) return '07:00';
        if (timeStr.includes('上午')) return '09:00';
        if (timeStr.includes('中午')) return '12:00';
        if (timeStr.includes('下午')) return '14:00';
        if (timeStr.includes('晚')) return '19:00';
        return '99:99';
      };
      
      return getStartTime(timeA).localeCompare(getStartTime(timeB));
    });

    res.json({
      success: true,
      data: allTasks,
      date: today,
      total: allTasks.length,
      continuationCount: continuationTasks.length
    });

  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 写入执行记录
app.post('/api/execution-logs', async (req, res) => {
  try {
    const { date, timeRange, task, pomodoroCount, actualDuration, taskId } = req.body;

    if (!date || !timeRange || !task) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const accessToken = await getAccessToken();

    const fields = {
      '执行日期': date,
      '时间段': timeRange,
      '任务': task,
      '番茄钟数': pomodoroCount || 1,
      '实际耗时': actualDuration || 25
    };

    if (taskId) {
      fields['任务ID'] = taskId;
    }

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.executionLogTableId}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );

    const data = await response.json();
    
    if (data.code === 0) {
      res.json({ success: true, data: data.data });
    } else {
      res.status(500).json({ success: false, error: data.msg });
    }

  } catch (error) {
    console.error('写入执行记录失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 获取统计
app.get('/api/stats/today', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.executionLogTableId}/records`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const data = await response.json();
    
    if (data.code !== 0) {
      return res.status(500).json({ success: false, error: data.msg });
    }

    // 统计今日数据
    const todayRecords = (data.data?.items || []).filter(item => {
      const execDate = item.fields['执行日期'];
      return execDate === today;
    });

    const totalPomodoros = todayRecords.reduce((sum, item) => sum + (item.fields['番茄钟数'] || 0), 0);
    const totalMinutes = todayRecords.reduce((sum, item) => sum + (item.fields['实际耗时'] || 0), 0);

    res.json({
      success: true,
      data: {
        pomodoros: totalPomodoros,
        minutes: totalMinutes
      }
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🍅 番茄钟服务已启动: http://localhost:${PORT}`);
  console.log(`📋 配置文件: ${configPath}`);
});
