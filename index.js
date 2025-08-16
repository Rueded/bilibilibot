require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const http = require('http');

// 创建简单的HTTP服务器防止休眠
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bilibili Discord Bot is running!');
});

// 启动HTTP服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 HTTP服务器启动在端口 ${PORT}`);
});

// 自我ping防止休眠（每14分钟）
const keepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(() => {
        axios.get(url).catch(() => {
            // 忽略错误，只是为了保持活跃
        });
        console.log('💓 发送心跳请求，保持服务活跃');
    }, 14 * 60 * 1000); // 14分钟
};

// 启动保持活跃功能
if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
    keepAlive();
}

// 配置信息 - 使用环境变量保护敏感信息
const config = {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.CHANNEL_ID,
    bilibiliUsers: [
        {
            uid: process.env.BILIBILI_UID_1,
            name: process.env.BILIBILI_NAME_1 || 'UP主1',
            isRoomId: process.env.BILIBILI_UID_1_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_2,
            name: process.env.BILIBILI_NAME_2 || 'UP主2',
            isRoomId: process.env.BILIBILI_UID_2_IS_ROOM === 'true'
        },
        {
            uid: process.env.BILIBILI_UID_3,
            name: process.env.BILIBILI_NAME_3 || 'UP主3',
            isRoomId: process.env.BILIBILI_UID_3_IS_ROOM === 'true' // 标记是否为直播间ID
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
    
    // 打印监控的UP主列表
    config.bilibiliUsers.forEach((user, index) => {
        console.log(`📺 ${index + 1}. ${user.name} (UID: ${user.uid})`);
    });
    
    // 初始化所有UP主的状态为未开播
    config.bilibiliUsers.forEach(user => {
        liveStatus.set(user.uid, false);
    });
    
    // 开始定时检查
    startLiveCheck();
});

// 检查B站直播状态的函数 - 支持UP主UID和直播间ID
async function checkBilibiliLive(uid, isRoomId = false) {
    try {
        console.log(`🔍 正在检查${isRoomId ? '直播间ID' : 'UP主UID'} ${uid} 的直播状态...`);
        
        if (isRoomId) {
            // 如果是直播间ID，直接使用房间API
            const roomResponse = await axios.get(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${uid}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://live.bilibili.com/'
                },
                timeout: 10000
            });
            
            if (roomResponse.data && roomResponse.data.code === 0) {
                const roomInfo = roomResponse.data.data.room_info;
                const isLive = roomInfo.live_status === 1;
                
                console.log(`📊 直播间状态 - Live Status: ${roomInfo.live_status} (${isLive ? '直播中' : '未开播'})`);
                console.log(`📊 直播标题: ${roomInfo.title}`);
                
                return {
                    isLive: isLive,
                    title: roomInfo.title || '无标题',
                    cover: roomInfo.cover || roomInfo.keyframe || '',
                    url: `https://live.bilibili.com/${uid}`,
                    roomid: uid,
                    online: roomInfo.online || 0
                };
            } else {
                console.log(`⚠️ 直播间API返回错误: ${roomResponse.data ? roomResponse.data.message : '未知错误'}`);
            }
        } else {
            // 原有的UP主UID逻辑
            const roomResponse = await axios.get(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://live.bilibili.com/'
                },
                timeout: 10000
            });
            
            if (roomResponse.data && roomResponse.data.code === 0) {
                const roomInfo = roomResponse.data.data;
                const roomId = roomInfo.roomid;
                
                console.log(`📋 房间信息 - RoomID: ${roomId}, LiveStatus: ${roomInfo.liveStatus}, Title: ${roomInfo.title || '无标题'}`);
                
                if (roomId && roomId !== 0) {
                    // 方法2: 使用房间ID获取更详细的直播状态
                    const detailResponse = await axios.get(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${roomId}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Referer': 'https://live.bilibili.com/'
                        },
                        timeout: 10000
                    });
                    
                    if (detailResponse.data && detailResponse.data.code === 0) {
                        const detailInfo = detailResponse.data.data;
                        const isLive = detailInfo.room_info.live_status === 1;
                        
                        console.log(`📊 详细状态 - Live Status: ${detailInfo.room_info.live_status} (${isLive ? '直播中' : '未开播'})`);
                        
                        return {
                            isLive: isLive,
                            title: detailInfo.room_info.title || '无标题',
                            cover: detailInfo.room_info.cover || detailInfo.room_info.keyframe || '',
                            url: `https://live.bilibili.com/${roomId}`,
                            roomid: roomId,
                            online: detailInfo.room_info.online || 0
                        };
                    }
                }
                
                // 如果详细API失败，使用基础信息
                return {
                    isLive: roomInfo.liveStatus === 1,
                    title: roomInfo.title || '无标题',
                    cover: roomInfo.cover || '',
                    url: roomInfo.url || `https://live.bilibili.com/${roomInfo.roomid}`,
                    roomid: roomInfo.roomid
                };
            } else {
                console.log(`⚠️ UP主API返回错误: ${roomResponse.data ? roomResponse.data.message : '未知错误'}`);
            }
        }
    } catch (error) {
        console.error(`❌ 检查${isRoomId ? '直播间ID' : 'UP主UID'} ${uid} 时出错:`, error.message);
        
        if (!isRoomId) {
            // 尝试备用API（仅对UP主UID）
            try {
                console.log(`🔄 尝试备用API...`);
                const backupResponse = await axios.get(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${uid}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.bilibili.com/'
                    },
                    timeout: 10000
                });
                
                if (backupResponse.data && backupResponse.data.code === 0) {
                    const roomData = backupResponse.data.data;
                    console.log(`🔄 备用API结果 - Live Status: ${roomData.live_status}`);
                    
                    return {
                        isLive: roomData.live_status === 1,
                        title: roomData.title || '无标题',
                        cover: '',
                        url: `https://live.bilibili.com/${roomData.room_id}`,
                        roomid: roomData.room_id
                    };
                }
            } catch (backupError) {
                console.error(`❌ 备用API也失败了:`, backupError.message);
            }
        }
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
    // 可选：启动后发送测试通知（设置为false可关闭）
    const sendStartupNotification = process.env.SEND_STARTUP_TEST === 'true';
    
    if (sendStartupNotification) {
        setTimeout(() => {
            sendTestNotification();
        }, 5000);
    }

    setInterval(async () => {
        console.log('🔍 检查直播状态中...');
        
        for (const user of config.bilibiliUsers) {
            console.log(`🔎 检查 ${user.name} (${user.isRoomId ? '直播间ID' : 'UP主UID'}: ${user.uid}) 的直播状态...`);
            const liveData = await checkBilibiliLive(user.uid, user.isRoomId);
            
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
