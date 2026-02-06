/**
id: PerformanceMonitor
name: PerformanceMonitor
description: 实时性能监控 HUD
icon: terminal
category: 工具
version: 1.0.1
 */

// ============ 配置 ============
const CONFIG = {
    windowId: 'perf-monitor',           // 窗口 ID（唯一标识）
    updateInterval: 1000,               // 更新间隔（毫秒）
    windowWidth: 280,                   // 窗口宽度
    windowHeight: 320,                  // 窗口高度
    position: { x: 20, y: 100 },        // 窗口位置
    colors: {
        background: '#000000',
        title: '#00FF88',
        label: '#AAAAAA',
        value: '#FFFFFF',
        warning: '#FFD700',
        critical: '#FF4444',
        good: '#00FF88',
        border: '#444444'
    }
};

// ============ 状态管理 ============
let state = {
    window: null,
    timer: null,
    isRunning: false,
    elements: {}
};

// ============ 辅助函数 ============

/**
 * 格式化百分比
 */
function formatPercent(value) {
    return value.toFixed(1) + '%';
}

/**
 * 格式化内存大小
 */
function formatMemory(mb) {
    if (mb >= 1024) {
        return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
}

/**
 * 根据 CPU 使用率获取颜色
 */
function getCpuColor(usage) {
    if (usage >= 90) return CONFIG.colors.critical;
    if (usage >= 70) return CONFIG.colors.warning;
    return CONFIG.colors.good;
}

/**
 * 根据 FPS 获取颜色
 */
function getFpsColor(fps) {
    if (fps < 20) return CONFIG.colors.critical;
    if (fps < 45) return CONFIG.colors.warning;
    return CONFIG.colors.good;
}

/**
 * 根据内存使用获取颜色
 */
function getMemoryColor(usage) {
    if (usage >= 400) return CONFIG.colors.critical;
    if (usage >= 200) return CONFIG.colors.warning;
    return CONFIG.colors.good;
}

/**
 * 创建进度条字符串
 */
function createProgressBar(percent, width) {
    width = width || 20;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '▓'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

// ============ 主要逻辑 ============

/**
 * 创建监控窗口
 */
function createMonitorWindow() {
    // 检查窗口是否已存在
    state.window = hud.getWindow(CONFIG.windowId);

    if (state.window) {
        console.log('[PerfMonitor] 窗口已存在，复用现有窗口');
        state.window.show();
        return state.window;
    }

    // 创建新窗口
    state.window = hud.createWindow({
        id: CONFIG.windowId,
        width: CONFIG.windowWidth,
        height: CONFIG.windowHeight,
        x: CONFIG.position.x,
        y: CONFIG.position.y,
        draggable: true,
        style: {
            backgroundColor: CONFIG.colors.background,
            cornerRadius: 16,
            borderWidth: 1,
            borderColor: CONFIG.colors.border,
            padding: 16
        }
    });

    // 创建标题栏
    const titleStack = state.window.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    titleStack.addText({
        text: '📊',
        fontSize: 18
    });

    titleStack.addText({
        text: '性能监控',
        fontSize: 16,
        fontWeight: 'bold',
        color: CONFIG.colors.title
    });

    titleStack.addSpacer({});

    // 关闭按钮
    const closeBtn = titleStack.addText({
        text: '✕',
        fontSize: 16,
        color: '#FF6666'
    });

    closeBtn.onClick(function () {
        stopMonitor();
    });

    // 分隔线
    state.window.addSpacer({ height: 12 });

    // ============ CPU 区域 ============
    const cpuSection = state.window.addStack({
        axis: 'vertical',
        spacing: 6
    });

    // CPU 标题
    cpuSection.addText({
        text: '🖥 CPU 使用率',
        fontSize: 13,
        fontWeight: 'semibold',
        color: CONFIG.colors.label
    });

    // 系统 CPU
    const sysCpuStack = cpuSection.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    sysCpuStack.addText({
        text: '系统:',
        fontSize: 12,
        color: CONFIG.colors.label
    });

    state.elements.sysCpuValue = sysCpuStack.addText({
        text: '-- %',
        fontSize: 14,
        fontWeight: 'medium',
        color: CONFIG.colors.value
    });

    sysCpuStack.addSpacer({});

    state.elements.sysCpuBar = sysCpuStack.addText({
        text: createProgressBar(0),
        fontSize: 10,
        color: CONFIG.colors.good
    });

    // 进程 CPU
    const procCpuStack = cpuSection.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    procCpuStack.addText({
        text: '进程:',
        fontSize: 12,
        color: CONFIG.colors.label
    });

    state.elements.procCpuValue = procCpuStack.addText({
        text: '-- %',
        fontSize: 14,
        fontWeight: 'medium',
        color: CONFIG.colors.value
    });

    procCpuStack.addSpacer({});

    state.elements.procCpuBar = procCpuStack.addText({
        text: createProgressBar(0),
        fontSize: 10,
        color: CONFIG.colors.good
    });

    // CPU 核心数
    const coresStack = cpuSection.addStack({
        axis: 'horizontal',
        spacing: 8
    });

    coresStack.addText({
        text: '核心数:',
        fontSize: 11,
        color: CONFIG.colors.label
    });

    state.elements.cpuCores = coresStack.addText({
        text: '--',
        fontSize: 11,
        color: CONFIG.colors.value
    });

    // 分隔
    state.window.addSpacer({ height: 12 });

    // ============ 内存区域 ============
    const memSection = state.window.addStack({
        axis: 'vertical',
        spacing: 6
    });

    memSection.addText({
        text: '💾 内存使用',
        fontSize: 13,
        fontWeight: 'semibold',
        color: CONFIG.colors.label
    });

    // 当前内存
    const memCurrentStack = memSection.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    memCurrentStack.addText({
        text: '当前:',
        fontSize: 12,
        color: CONFIG.colors.label
    });

    state.elements.memCurrent = memCurrentStack.addText({
        text: '-- MB',
        fontSize: 14,
        fontWeight: 'medium',
        color: CONFIG.colors.value
    });

    memCurrentStack.addSpacer({});

    state.elements.memBar = memCurrentStack.addText({
        text: createProgressBar(0),
        fontSize: 10,
        color: CONFIG.colors.good
    });

    // 峰值内存
    const memPeakStack = memSection.addStack({
        axis: 'horizontal',
        spacing: 8
    });

    memPeakStack.addText({
        text: '峰值:',
        fontSize: 11,
        color: CONFIG.colors.label
    });

    state.elements.memPeak = memPeakStack.addText({
        text: '-- MB',
        fontSize: 11,
        color: CONFIG.colors.value
    });

    // 分隔
    state.window.addSpacer({ height: 12 });

    // ============ FPS 区域 ============
    const fpsSection = state.window.addStack({
        axis: 'vertical',
        spacing: 6
    });

    fpsSection.addText({
        text: '🎬 帧率监控',
        fontSize: 13,
        fontWeight: 'semibold',
        color: CONFIG.colors.label
    });

    const fpsStack = fpsSection.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    state.elements.fpsValue = fpsStack.addText({
        text: '-- FPS',
        fontSize: 20,
        fontWeight: 'bold',
        color: CONFIG.colors.good
    });

    fpsStack.addSpacer({});

    state.elements.fpsStatus = fpsStack.addText({
        text: '●',
        fontSize: 16,
        color: CONFIG.colors.good
    });

    // 分隔
    state.window.addSpacer({ height: 12 });

    // ============ 状态区域 ============
    const statusStack = state.window.addStack({
        axis: 'horizontal',
        alignment: 'center',
        spacing: 8
    });

    state.elements.statusDot = statusStack.addText({
        text: '●',
        fontSize: 10,
        color: CONFIG.colors.good
    });

    state.elements.statusText = statusStack.addText({
        text: '监控中...',
        fontSize: 11,
        color: CONFIG.colors.label
    });

    statusStack.addSpacer({});

    state.elements.timestamp = statusStack.addText({
        text: '--:--:--',
        fontSize: 10,
        color: CONFIG.colors.label
    });

    state.window.show();
    console.log('[PerfMonitor] 监控窗口已创建');

    return state.window;
}

/**
 * 更新性能数据
 */
function updateMetrics() {
    try {
        // 获取 CPU 数据
        const cpu = app.cpuUsage();
        const sysCpuTotal = cpu.system.total;
        const procCpu = cpu.process;
        const cores = cpu.system.cores;

        // 获取内存数据
        const memory = app.memoryUsage();
        const memUsage = memory.usage;
        const memPeak = memory.peak;

        // 获取 FPS 数据
        const fpsData = app.fps();
        const fps = fpsData.fps;

        // 更新 CPU 显示
        state.elements.sysCpuValue.setText(formatPercent(sysCpuTotal));
        state.elements.sysCpuValue.setColor(getCpuColor(sysCpuTotal));
        state.elements.sysCpuBar.setText(createProgressBar(sysCpuTotal, 15));
        state.elements.sysCpuBar.setColor(getCpuColor(sysCpuTotal));

        state.elements.procCpuValue.setText(formatPercent(procCpu));
        state.elements.procCpuValue.setColor(getCpuColor(procCpu));
        state.elements.procCpuBar.setText(createProgressBar(Math.min(procCpu, 100), 15));
        state.elements.procCpuBar.setColor(getCpuColor(procCpu));

        state.elements.cpuCores.setText(cores + ' 核心');

        // 更新内存显示
        state.elements.memCurrent.setText(formatMemory(memUsage));
        state.elements.memCurrent.setColor(getMemoryColor(memUsage));
        // 假设 500MB 为最大显示范围
        state.elements.memBar.setText(createProgressBar(Math.min(memUsage / 5, 100), 15));
        state.elements.memBar.setColor(getMemoryColor(memUsage));

        state.elements.memPeak.setText(formatMemory(memPeak));

        // 更新 FPS 显示
        state.elements.fpsValue.setText(Math.round(fps) + ' FPS');
        state.elements.fpsValue.setColor(getFpsColor(fps));
        state.elements.fpsStatus.setColor(getFpsColor(fps));

        // 更新时间戳
        const now = new Date();
        const timeStr = [
            now.getHours().toString().padStart(2, '0'),
            now.getMinutes().toString().padStart(2, '0'),
            now.getSeconds().toString().padStart(2, '0')
        ].join(':');
        state.elements.timestamp.setText(timeStr);

        // 状态指示
        state.elements.statusDot.setColor(CONFIG.colors.good);
        state.elements.statusText.setText('监控中...');

    } catch (error) {
        console.log('[PerfMonitor] 更新错误: ' + error);
        state.elements.statusDot.setColor(CONFIG.colors.critical);
        state.elements.statusText.setText('更新错误');
    }
}

/**
 * 启动监控
 */
function startMonitor() {
    if (state.isRunning) {
        console.log('[PerfMonitor] 监控已在运行中');
        return;
    }

    console.log('[PerfMonitor] 启动性能监控...');

    // 先启动性能监控服务
    app.startMonitoring();

    // 创建窗口
    createMonitorWindow();

    // 首次更新
    updateMetrics();

    // 设置定时更新
    state.timer = setInterval(function () {
        updateMetrics();
    }, CONFIG.updateInterval);

    state.isRunning = true;
    console.log('[PerfMonitor] 性能监控已启动');
}

/**
 * 停止监控
 */
function stopMonitor() {
    console.log('[PerfMonitor] 停止性能监控...');

    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }

    if (state.window) {
        state.window.remove();
        state.window = null;
    }

    // 停止性能监控服务
    app.stopMonitoring();

    state.isRunning = false;
    state.elements = {};

    console.log('[PerfMonitor] 性能监控已停止');
}

// ============ 入口 ============

// 启动监控
startMonitor();

// 导出控制函数（供外部调用）
// globalThis.PerfMonitor = {
//     start: startMonitor,
//     stop: stopMonitor
// };

console.log('=================================');
console.log('  TrollScript 性能监控 v1.0.0');
console.log('  点击 ✕ 按钮关闭监控窗口');
console.log('=================================');
