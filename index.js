require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// 配置信息 - 使用环境变量保护敏感信息
const config = {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.CHANNEL_ID,
    bilibiliUsers: [
        {
            uid: process.env.BILIBILI_UID_1,
            name: process.env.BILIBILI_NAME_1 || 'UP主1'
        },
        {
            uid: process.env.BILIBILI_UID_2,
            name: process.env.BILIBILI_NAME_2 || 'UP主2'
        },
        {
            uid: process.env.BILIBILI_UID_3,
            name: process.env.BILIBILI_NAME_3 || 'UP主3'
        }
        // 在环境变量中添加更多UP主: BILIBILI_UID_3, BILIBILI_NAME_3 等
    ].filter(user => user.uid), // 过滤掉未设置的UP主
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60000 // 默认60秒检查一次
};

// 创建Discord客户端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 存储UP主的直播状态
let liveStatus = new Map();

// 机器人启动时的事件
client.once('ready', () => {
    console.log(`✅ 机器人已启动: ${client.user.tag}`);
    console.log(`🔍 开始监控 ${config.bilibiliUsers.length} 位UP主的直播状态...`);
    
    // 初始化所有UP主的状态为未开播
    config.bilibiliUsers.forEach(user => {
        liveStatus.set(user.uid, false);
    });
    
    // 开始定时检查
    startLiveCheck();
});

// 检查B站直播状态的函数
async function checkBilibiliLive(uid) {
    try {
        // 使用B站API获取直播间信息
        const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        if (response.data && response.data.code === 0) {
            const roomInfo = response.data.data;
            return {
                isLive: roomInfo.liveStatus === 1,
                title: roomInfo.title || '无标题',
                cover: roomInfo.cover || '',
                url: roomInfo.url || `https://live.bilibili.com/${roomInfo.roomid}`,
                roomid: roomInfo.roomid
            };
        }
    } catch (error) {
        console.error(`❌ 检查UID ${uid} 时出错:`, error.message);
    }
    return null;
}

// 发送开播通知
async function sendLiveNotification(userInfo, liveData) {
    try {
        const channel = client.channels.cache.get(config.channelId);
        if (!channel) {
            console.error('❌ 找不到指定的频道');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔴 直播开始啦!')
            .setDescription(`**${userInfo.name}** 正在直播`)
            .addFields(
                { name: '直播标题', value: liveData.title, inline: false },
                { name: '直播间链接', value: liveData.url, inline: false }
            )
            .setColor(0x00D4FF)
            .setTimestamp()
            .setFooter({ text: 'B站直播通知' });

        if (liveData.cover) {
            embed.setImage(liveData.cover);
        }

        await channel.send({ 
            content: `@everyone ${userInfo.name} 开播啦！快来围观~ 🎉`,
            embeds: [embed] 
        });
        
        console.log(`✅ 已发送 ${userInfo.name} 的开播通知`);
    } catch (error) {
        console.error('❌ 发送通知时出错:', error);
    }
}

// 发送测试通知的函数
async function sendTestNotification() {
    try {
        const channel = client.channels.cache.get(config.channelId);
        if (!channel) {
            console.error('❌ 找不到指定的频道，请检查CHANNEL_ID是否正确');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🤖 测试通知')
            .setDescription('机器人运行正常！这是一条测试消息。')
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: '机器人测试' });

        await channel.send({ 
            content: `✅ 机器人测试成功！正在监控 ${config.bilibiliUsers.length} 位UP主`,
            embeds: [embed] 
        });
        
        console.log(`✅ 测试通知发送成功`);
    } catch (error) {
        console.error('❌ 发送测试通知时出错:', error);
    }
}

// 开始定时检查直播状态
function startLiveCheck() {
    // 启动后5秒发送测试通知
    setTimeout(() => {
        sendTestNotification();
    }, 5000);

    setInterval(async () => {
        console.log('🔍 检查直播状态中...');
        
        for (const user of config.bilibiliUsers) {
            console.log(`🔎 检查 ${user.name} (UID: ${user.uid}) 的直播状态...`);
            const liveData = await checkBilibiliLive(user.uid);
            
            if (liveData) {
                const wasLive = liveStatus.get(user.uid);
                const isNowLive = liveData.isLive;
                
                console.log(`📊 ${user.name} 当前状态: ${isNowLive ? '🔴直播中' : '⚫未开播'} (之前: ${wasLive ? '直播中' : '未开播'})`);
                
                // 如果之前未开播，现在开播了，则发送通知
                if (!wasLive && isNowLive) {
                    console.log(`🎉 ${user.name} 开播了!`);
                    await sendLiveNotification(user, liveData);
                    liveStatus.set(user.uid, true);
                } else if (wasLive && !isNowLive) {
                    // 如果之前开播，现在停播了，更新状态
                    console.log(`📺 ${user.name} 已停播`);
                    liveStatus.set(user.uid, false);
                }
            } else {
                console.log(`⚠️ 无法获取 ${user.name} 的直播信息`);
            }
            
            // 每个UP主之间间隔一点时间，避免请求太频繁
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ 本轮检查完成\n');
    }, config.checkInterval);
}

// 错误处理
client.on('error', error => {
    console.error('❌ Discord客户端错误:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ 未处理的Promise拒绝:', error);
});

// 启动机器人
client.login(config.token).catch(error => {
    console.error('❌ 机器人登录失败:', error);
});
