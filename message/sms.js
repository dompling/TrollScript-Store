/*
 id: ExpressSMS
 name: ExpressSMS
 description: 提取快递短信取件码
 icon: message
 category: 工具
 version: 1.0.3
 */

function main() {
    try {
        const messages = sms.read(20);
        if (!messages || messages.length === 0) {
            console.log("未读取到短信");
            return "未读取到短信";
        }

        const patterns = [
            {
                // 丰巢类
                regex: /(?:【丰巢】|\[丰巢\]).*?取件码\s*(\d+).*?至\s*(.+?)(?:取件|$)/,
                codeIndex: 1,
                locationIndex: 2
            },
            {
                // 通用快递类：支持换行、支持"凭xx取件"分两行
                regex: /(?:【(.*?)】|\[(.*?)\]).*?(?:已到|到达|至)\s*(.+?)(?:，|。|、|请)[\s\S]*?(?:凭|取件码|提取码)\s*([A-Za-z0-9-]+?)\s*(?:取件|$)/,
                codeIndex: 4,
                locationIndex: 3
            }
        ];

        const upcomingReminders = reminder.getUpcoming(7) || [];

        // 获取"取件码"列表的 ID（如果存在）
        const lists = reminder.getLists() || [];
        const pickupList = lists.find(list => list.title === "取件码");
        const pickupListId = pickupList ? pickupList.id : null;

        const STORAGE_KEY = 'sms_processed_codes';
        let processedCodes = storage.get(STORAGE_KEY) || [];

        let processedCount = 0;
        let hasNew = false;

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            // 统一处理文本：把换行、多个空白压成一个空格，增强正则稳定性
            const rawText = msg.text || msg.body || "";
            const text = rawText.replace(/\s+/g, " ").trim();

            let match = null;
            let code = null;
            let location = null;

            for (const pattern of patterns) {
                match = text.match(pattern.regex);
                if (match) {
                    code = match[pattern.codeIndex];
                    location = match[pattern.locationIndex];
                    break;
                }
            }

            if (match && code && location) {
                code = String(code).trim();
                location = String(location).trim();

                // 唯一标识：仅使用取件码，避免位置变化导致重复
                const uniqueKey = code;

                // 查重逻辑：检查缓存 / 兼容旧格式 code|location
                if (processedCodes.some(item => item === uniqueKey || (typeof item === 'string' && item.startsWith(`${code}|`)))) {
                    console.log(`跳过已缓存的取件码: ${code}`);
                    continue;
                }

                const isDuplicateReminder = upcomingReminders.some(r => {
                    const title = r && r.title ? String(r.title) : "";
                    return title.includes(code);
                });

                if (isDuplicateReminder) {
                    console.log(`跳过现有提醒事项: ${code}`);
                    if (!processedCodes.includes(uniqueKey)) {
                        processedCodes.push(uniqueKey);
                        storage.set(STORAGE_KEY, processedCodes);
                        hasNew = true;
                    }
                    continue;
                }

                // 创建提醒：使用 listId（如果找到"取件码"列表）
                const reminderOptions = {
                    notes: `位置: ${location}\n原文: ${rawText}`,
                    priority: 5
                };
                if (pickupListId) {
                    reminderOptions.listId = pickupListId;
                }

                const reminderResult = reminder.create(`取件码: ${code}`, reminderOptions);

                const notifyResult = notification.send(
                    "快递取件提醒",
                    `凭取件码 ${code} 至 ${location} 取件`,
                    {}
                );

                console.log(`已提取取件码: ${code} (${location})`);
                console.log("提醒创建结果:", reminderResult);
                console.log("通知发送结果:", notifyResult);

                // 更新缓存
                processedCodes.push(uniqueKey);
                storage.set(STORAGE_KEY, processedCodes);
                hasNew = true;
                processedCount++;
            }
        }

        if (processedCount === 0) {
            console.log("未找到新的取件码短信");
            return "未找到新的取件码短信";
        }

        return `处理完成：${processedCount} 条新取件码`;
    } catch (error) {
        console.error("脚本执行失败：", error);
        return `脚本执行失败：${error}`;
    }
}

return main();
