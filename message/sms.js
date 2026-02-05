/*
 id: ExpressSMS
 name: ExpressSMS
 description: 提取快递短信取件码
 icon: message
 category: 工具
 version: 1.0.2
 */

function main() {
    const messages = sms.read(20);
    if (!messages || messages.length === 0) {
        console.log("未读取到短信");
        return;
    }

    const patterns = [
        {
            regex: /(?:【丰巢】|\[丰巢\]).*?取件码\s*(\d+).*?至\s*(.+?)(?:取件|$)/,
            codeIndex: 1,
            locationIndex: 2
        },
        {
            regex: /(?:【(.*?)】|\[(.*?)\]).*?(?:已到|至)\s*(.+?)(?:，|。|、|请).*?凭\s*([A-Za-z0-9-]+?)取件/,
            codeIndex: 4,
            locationIndex: 3
        }
    ];

    const upcomingReminders = reminder.getUpcoming(7) || [];

    const STORAGE_KEY = 'sms_processed_codes';
    let processedCodes = storage.get(STORAGE_KEY) || [];

    let processedCount = 0;
    let hasNew = false;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let match = null;
        let code = null;
        let location = null;

        for (const pattern of patterns) {
            match = msg.text.match(pattern.regex);
            if (match) {
                code = match[pattern.codeIndex];
                location = match[pattern.locationIndex];
                break;
            }
        }

        if (match && code && location) {
            // 唯一标识 (仅使用取件码，防止位置描述不同导致重复)
            const uniqueKey = code;

            // 查重逻辑 1: 检查持久化缓存 (以及本次运行已处理的)
            // 兼容旧的缓存格式 "code|location"
            if (processedCodes.some(item => item === uniqueKey || item.startsWith(`${code}|`))) {
                console.log(`跳过已缓存的取件码: ${code}`);
                continue;
            }

            const isDuplicateReminder = upcomingReminders.some(r => r.title.includes(code));
            if (isDuplicateReminder) {
                console.log(`跳过现有提醒事项: ${code}`);
                // 即使缓存没有，如果有提醒了，也加入缓存
                if (!processedCodes.includes(uniqueKey)) {
                    processedCodes.push(uniqueKey);
                    hasNew = true;
                }
                continue;
            }

            reminder.createSystemReminder(`取件码: ${code}`, {
                notes: `位置: ${location}\n原文: ${msg.text || msg.body}`,
                priority: 5,
                listTitle: "取件码"
            });

            notification.send("快递取件提醒", `凭取件码 ${code} 至 ${location} 取件`, {});

            console.log(`已提取取件码: ${code} (${location})`);

            // 更新缓存
            processedCodes.push(uniqueKey);
            storage.set(STORAGE_KEY, processedCodes);
            hasNew = true;
            processedCount++;
        }
    }

    if (processedCount === 0) {
        console.log("未找到新的取件码短信");
    }
}

main();
