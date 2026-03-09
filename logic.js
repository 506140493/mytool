let currentPrefix = ""; // 存储拼接用的：[公历+干支历]
// 核心计算逻辑：获取干支
function getFullContext(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const min = date.getMinutes();
    const timeStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    if (typeof jqData === 'undefined') return { greg: timeStr, ganzhi: "数据未加载" };
    const yearData = jqData[y];
    if (!yearData) return { greg: timeStr, ganzhi: "年份数据缺失" };

    // --- 内部核心算法函数 (参考你提供的源码) ---
    
    // 判断闰年
    const isLeap = (year) => (year % 100 === 0 ? year % 400 === 0 : year % 4 === 0);

    // 计算日干支 (参考原源码 u 函数)
    const getDayGZ = (year, month, day, hour) => {
        const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (isLeap(year)) monthDays[1] = 29;
        
        let totalDays = Math.floor(5.25 * (year - 1));
        for (let i = 0; i < month - 1; i++) {
            totalDays += monthDays[i];
        }
        totalDays += day;
        
        let c = totalDays % 60;
        let u_idx = c % 10;
        let v_idx = c % 12;
        
        // 子时换日
        if (hour >= 23) {
            u_idx = (u_idx + 1) % 10;
            v_idx = (v_idx + 1) % 12;
        }
        
        const resStem = Stems[u_idx === 0 ? 9 : u_idx - 1];
        const resBranch = Branches[v_idx === 0 ? 11 : v_idx - 1];
        return { gz: resStem + resBranch, stem: resStem, branch: resBranch };
    };

    // 五虎遁/五鼠遁 (参考原源码 l 函数)
    const get遁干 = (baseStem, targetBranch, isHour) => {
        let startStemIdx, startBranchIdx;
        if (["甲", "己"].includes(baseStem)) { startStemIdx = 2; startBranchIdx = 0; } // 甲己丙作首 / 甲己甲子头
        else if (["乙", "庚"].includes(baseStem)) { startStemIdx = 4; startBranchIdx = 2; }
        else if (["丙", "辛"].includes(baseStem)) { startStemIdx = 6; startBranchIdx = 4; }
        else if (["丁", "壬"].includes(baseStem)) { startStemIdx = 8; startBranchIdx = 6; }
        else if (["戊", "癸"].includes(baseStem)) { startStemIdx = 0; startBranchIdx = 8; }

        let curBranchIdx = isHour ? Branches.indexOf(Branches[0]) : Branches.indexOf(Branches[2]); 
        let targetBranchIdx = Branches.indexOf(targetBranch);
        let curStemIdx = isHour ? startBranchIdx : startStemIdx;

        for (let i = 0; i < 12 && curBranchIdx !== targetBranchIdx; i++) {
            curBranchIdx = (curBranchIdx + 1) % 12;
            curStemIdx = (curStemIdx + 1) % 10;
        }
        return Stems[curStemIdx];
    };

    // --- 开始推算 ---

    // 1. 定年干支
    let b = 0;
    while (b < 24 && !(timeStr < yearData[b])) b++;
    const yForGZ = b <= 2 ? y - 1 : y;
    const yearGZ = Stems[(yForGZ - 4) % 10] + Branches[(yForGZ - 4) % 12];

    // 2. 定月干支 (严格参考源码逻辑)
    let t = 0;
    for (t = 0; t < 12 && !(timeStr < yearData[2 * t]); t++);
    if (t === 12) t = 0;
    const monthBranch = Branches[t % 12]; // 原源码中为 a[t]，此处对齐 Branches
    const monthStem = get遁干(Stems[(yForGZ - 4) % 10], monthBranch, false);
    const monthGZ = monthStem + monthBranch;

    // 3. 定日干支
    const dayObj = getDayGZ(y, m, d, h);
    const dayGZ = dayObj.gz;

    // 4. 定时干支
    const hourBranch = h >= 23 ? Branches[0] : Branches[Math.floor((h + 1) / 2)];
    const hourStem = get遁干(dayObj.stem, hourBranch, true);
    const hourGZ = hourStem + hourBranch;

    return {
        greg: timeStr,
        ganzhi: `${yearGZ}年 ${monthGZ}月 ${dayGZ}日 ${hourGZ}时`
    };
}



// 将选择框重置为当前系统时间并触发查询
function setToNow() {
    const now = new Date();
    document.getElementById('selectY').value = now.getFullYear();
    document.getElementById('selectM').value = now.getMonth() + 1;
    document.getElementById('selectD').value = now.getDate();
    
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('selectTime').value = `${hh}:${mm}`;
    
    queryCustomTime(); // 自动执行一次查询
}

// 查询指定的时间
function queryCustomTime() {
    const y = parseInt(document.getElementById('selectY').value);
    const m = parseInt(document.getElementById('selectM').value);
    const d = parseInt(document.getElementById('selectD').value);
    const t = document.getElementById('selectTime').value || "00:00";

    if (isNaN(y) || isNaN(m) || isNaN(d)) {
        alert("请输入完整的年月日");
        return;
    }

    // 构造 Date 对象
    const targetDate = new Date(`${y}-${m}-${d} ${t}`);
    
    // 调用核心转换逻辑
    const res = getFullContext(targetDate);
    
    // 更新显示
    document.getElementById('gzText').innerText = "干支：" + res.ganzhi;
    
    // 重要：同步更新后台拼接用的前缀
    currentPrefix = `[${res.greg} ${res.ganzhi}] `;
}

// 刷新界面数据
function updateDisplay() {
    // 现在逻辑由 queryCustomTime 接管
    queryCustomTime();
}

// 修正后的复制时间函数
function copyCurrent() {
    // 直接使用 currentPrefix，它已经包含了 [公历+干支历]
    if (!currentPrefix) {
        alert("请先点击查询获取时间");
        return;
    }
    // 去掉方括号方便记录（或者保留，看你习惯）
    const text = currentPrefix.replace('[', '').replace(']', '').trim();
    doCopy(text);
}

// 复制后台文本（带前缀）
function copyBgText(id) {
    // 拼接格式：[时间] 【标题】内容
    const text = currentPrefix + bgTexts[id];
    doCopy(text);
}

// 查看节气
function renderJieQi() {
    const year = document.getElementById('yearInput').value;
    const data = jqData[year];
    const container = document.getElementById('jqResult');
    if (!data) {
        container.innerHTML = "<p style='color:red'>字典中暂无该年份数据</p>";
        return;
    }
    let table = "<table><tr><th>节气</th><th>具体时间</th></tr>";
    jqNames.forEach((name, i) => {
        table += `<tr><td>${name}</td><td>${data[i]}</td></tr>`;
    });
    container.innerHTML = table + "</table>";
}

// 统一复制函数 (用于干支历、全天扫描等按钮)
function doCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        msgToast("复制成功！");
    }).catch(err => {
        alert("复制失败，请手动选择复制");
    });
}

// 存储最后一次生成的随机数，方便复制
let currentRandomResult = "";

// 生成随机数的核心逻辑
function generateRandomNumbers() {
    const count = parseInt(document.getElementById('countNum').value);
    const min = parseInt(document.getElementById('minNum').value);
    const max = parseInt(document.getElementById('maxNum').value);
    const canRepeat = document.getElementById('allowRepeat').checked;
    const resultDiv = document.getElementById('randomResult');

    // 基础校验
    if (isNaN(count) || isNaN(min) || isNaN(max)) {
        alert("请输入完整的数字");
        return;
    }
    if (min >= max) {
        alert("最大值必须大于最小值");
        return;
    }
    if (!canRepeat && (max - min + 1) < count) {
        alert("范围不足以生成不重复的随机数，请扩大范围或勾选允许重复");
        return;
    }

    let results = [];
    if (canRepeat) {
        // 允许重复的逻辑
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
    } else {
        // 不允许重复的逻辑 (洗牌算法思想)
        let pool = [];
        for (let i = min; i <= max; i++) {
            pool.push(i);
        }
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            results.push(pool.splice(randomIndex, 1)[0]);
        }
    }

    currentRandomResult = results.join(', ');
    resultDiv.innerText = currentRandomResult;
}

// 统一的轻量级提示函数 (Toast) @param {string} msg 提示内容
function msgToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerText = msg;
    toast.style.display = 'block';
    
    // 清除之前的定时器，防止连续点击导致闪烁
    if (window.toastTimer) clearTimeout(window.toastTimer);
    
    window.toastTimer = setTimeout(() => {
        toast.style.display = 'none';
    }, 1500);
}

// 复制随机数结果的函数
function copyRandomResults() {
    const resultDiv = document.getElementById('randomResult');
    const resultText = resultDiv.innerText;

    // 逻辑拦截：识别是否是初始状态
    if (resultText === "等待生成..." || resultText === "" || !currentRandomResult) {
        msgToast("请先生成随机数！"); 
        return;
    }

    navigator.clipboard.writeText(currentRandomResult).then(() => {
        msgToast("复制成功！");
    }).catch(err => {
        msgToast("复制失败！");
        console.error("复制出错:", err);
    });
}

// 获取实盘信息并复制
function fetchAndCopyStock() {
    let code = document.getElementById('stockCode').value.trim();
    if (!code) {
        msgToast("请输入股票代码");
        return;
    }

    // 自动补全前缀逻辑
    if (!/^(sh|sz|bj)/i.test(code)) {
        // 特殊处理：上证指数
        if (code === '000001') {
            code = 'sh000001';
        } 
        // 沪市主板
        else if (code.startsWith('6')) {
            code = 'sh' + code;
        } 
        // 深市或创业板
        else if (code.startsWith('0') || code.startsWith('3')) {
            code = 'sz' + code;
        }
    }

    const script = document.createElement('script');
    script.src = `https://qt.gtimg.cn/q=${code}`;
    
    script.onload = function() {
        const rawData = window['v_' + code];
        if (!rawData) {
            msgToast("未获取到数据");
            return;
        }
        const d = rawData.split('~');
        const info = `【实盘快报】${d[1]}(${d[2]})\t昨日收盘价:${d[4]}\t当前价格(最新成交价): ${d[3]}\t今日开盘价:${d[5]}\t当前价:${d[3]}\t涨跌幅:${d[32]}%\t换手率:${d[38]}%\t成交额(万元):${d[36]}\t今日最高价:${d[33]}\t今日最低价:${d[34]}\t`;

        navigator.clipboard.writeText(info).then(() => {
            msgToast("实盘信息已复制！");
        }).catch(() => {
            alert("复制失败，数据为：\n" + info);
        });
        document.body.removeChild(script);
    };

    script.onerror = function() {
        msgToast("接口请求失败");
        if (script.parentNode) document.body.removeChild(script);
    };

    document.body.appendChild(script);
}

// 页面加载初始化
window.onload = () => {
    setToNow(); // 页面加载时默认显示当前时间
    document.getElementById('yearInput').value = new Date().getFullYear();
};