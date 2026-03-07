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

// 统一复制函数
function doCopy(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 1500);
    });
}

// 存储最后一次生成的随机数，方便复制
let currentRandomResult = "";

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

function copyRandomResults() {
    const toast_random = document.getElementById('toast_random');
    const resultDiv = document.getElementById('randomResult');
    const resultText = resultDiv.innerText;

    // 定义一个统一的显示函数，1.5秒后自动隐藏
    const showToast = (msg) => {
        toast_random.innerText = msg;
        toast_random.style.display = 'block';
        setTimeout(() => {
            toast_random.style.display = 'none';
        }, 1500);
    };

    // 1. 业务逻辑拦截：识别是否是初始状态
    if (resultText === "等待生成..." || resultText === "" || !currentRandomResult) {
        showToast("请先生成随机数！"); // 仅提示，无需点击
        return;
    }

    // 2. 执行复制逻辑
    navigator.clipboard.writeText(currentRandomResult).then(() => {
        showToast("复制成功！"); // 成功提示
    }).catch(err => {
        showToast("复制失败！"); // 失败提示，同样无需点击
        console.error("复制出错:", err);
    });
}

// 页面加载初始化
window.onload = () => {
    setToNow(); // 页面加载时默认显示当前时间
    document.getElementById('yearInput').value = new Date().getFullYear();
};