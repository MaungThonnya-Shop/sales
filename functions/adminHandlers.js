// functions/adminHandlers.js

import {
    sendMessage,
    isUserAdmin,
    getMe,
    kickChatMember,
    restrictChatMember,
    unbanChatMember,
    unrestrictChatMember,
    sendDocument,
    sendPhoto,
    getChatMember,
    deleteUserData,
    editMessageText,
    answerCallbackQuery,
    deleteMessage
} from './telegramHelpers.js';
import {
    OWNER_ADMIN_IDS,
    VIEW_PAYMENT_BUTTON,
    ADMIN_USERNAME, // Add ADMIN_USERNAME to import
    VPN_GUIDE_BUTTON // NEW: Import VPN_GUIDE_BUTTON
} from './constants.js';
import {
    getPaymentDetails,
    updatePaymentStatus,
    getVpnKey,
    updateVpnKeyStatus,
    getUserTrialStatus,
    getVpnKeyByUniqueId
} from './dataStorage.js';
import {
    findAvailableVpnKeyByType
} from './paymentHandlers.js';


// Timezone အတွက် Helper Function
export function toThaiDateTime(dateString) {
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok'
    };
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', options);
    } catch (e) {
        console.error(`Error formatting date: ${e}`);
        return dateString;
    }
}

// Function to handle the /id command
export async function handleIdCommand(message, token, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const messageText = `ဤ Group ၏ ID: \`${chatId}\`\nသင်၏ ID: \`${userId}\``;
    await sendMessage(token, chatId, messageText, 'Markdown', null, botKeyValue);
}

// Function to handle the /info command
export async function handleInfoCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    let messageText = ``;
    let targetUser;

    if (message.reply_to_message) {
        targetUser = message.reply_to_message.from;
    } else {
        targetUser = message.from;
    }

    const userLink = targetUser.username ? `@${targetUser.username}` : `<a href='tg://user?id=${targetUser.id}'>${targetUser.first_name}</a>`;

    messageText += `<b>User Information:</b>\n`;
    messageText += `ID: <code>${targetUser.id}</code>\n`;
    messageText += `Name: ${userLink}\n`;
    if (targetUser.username) {
        messageText += `Username: @${targetUser.username}\n`;
    }
    messageText += `Is Bot: ${targetUser.is_bot ? '✅' : '❌'}\n`;
    messageText += `Is Premium: ${targetUser.is_premium ? '✅' : '❌'}\n`;

    const userData = await env.SALES_DATA.get(`user_data:${targetUser.id}`, {
        type: 'json'
    });
    if (userData) {
        messageText += `\n<b>Bot-specific Data:</b>\n`;
        if (userData.is_banned) {
            messageText += `Status: <b>Banned</b> ❌\n`;
        }
        if (userData.first_seen) {
            messageText += `First seen: ${toThaiDateTime(userData.first_seen)}\n`;
        }
        if (userData.last_seen) {
            messageText += `Last seen: ${toThaiDateTime(userData.last_seen)}\n`;
        }
    }

    await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
}


// Function to handle /ban and /kick commands
export async function handleBanCommand(message, token, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const botId = (await getMe(token, botKeyValue)).id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const repliedMessage = message.reply_to_message;
    if (!repliedMessage) {
        await sendMessage(token, chatId, "❌ message ကို reply ပြန်ပြီး အသုံးပြုပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const targetUser = repliedMessage.from;
    const targetUserId = targetUser.id;

    if (OWNER_ADMIN_IDS.includes(targetUserId) || targetUserId === userId || targetUserId === botId) {
        await sendMessage(token, chatId, "❌ ban/kick လုပ်မရပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const userLink = targetUser.username ? `@${targetUser.username}` : `<a href='tg://user?id=${targetUser.id}'>${targetUser.first_name}</a>`;
    let success = false;
    let messageText = "";

    if (message.text.startsWith('/ban')) {
        success = await kickChatMember(token, chatId, targetUserId, 0, botKeyValue);
        if (success) {
            messageText = `✅ ${userLink} ကို Group မှ အပြီးတိုင် ban လိုက်ပါပြီ။`;
            await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
        } else {
            messageText = `❌ ${userLink} ကို ban လုပ်မရပါ။ Bot တွင် Admin အခွင့်အရေး အပြည့်အစုံရှိမရှိ စစ်ဆေးပေးပါ။`;
            await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
        }
    } else if (message.text.startsWith('/kick')) {
        success = await kickChatMember(token, chatId, targetUserId, null, botKeyValue);
        if (success) {
            messageText = `✅ ${userLink} ကို Group မှ ထုတ်ပယ်လိုက်ပါပြီ။`;
            await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
        } else {
            messageText = `❌ ${userLink} ကို kick လုပ်မရပါ။ Bot တွင် Admin အခွင့်အရေး အပြည့်အစုံရှိမရှိ စစ်ဆေးပေးပါ။`;
            await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
        }
    }
}


// Function to handle /mute command
export async function handleMuteCommand(message, token, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const botId = (await getMe(token, botKeyValue)).id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const repliedMessage = message.reply_to_message;
    if (!repliedMessage) {
        await sendMessage(token, chatId, "❌ message ကို reply ပြန်ပြီး အသုံးပြုပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const targetUser = repliedMessage.from;
    const targetUserId = targetUser.id;

    if (OWNER_ADMIN_IDS.includes(targetUserId) || targetUserId === userId || targetUserId === botId) {
        await sendMessage(token, chatId, "❌ mute လုပ်၍မရပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const userLink = targetUser.username ? `@${targetUser.username}` : `<a href='tg://user?id=${targetUser.id}'>${targetUser.first_name}</a>`;
    let success = false;

    success = await restrictChatMember(token, chatId, targetUserId, 600, botKeyValue);

    if (success) {
        const replyMarkup = {
            inline_keyboard: [
                [{
                    text: "✅ Unmute",
                    callback_data: `unmute_${targetUserId}_${chatId}`
                }]
            ]
        };
        await sendMessage(token, chatId, `✅ ${userLink} ကို ၁၀ မိနစ်စာ စာပို့ခွင့် ပိတ်လိုက်ပါပြီ။`, 'HTML', replyMarkup, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ ${userLink} ကို mute လုပ်မရပါ။ Bot တွင် Admin အခွင့်အရေး အပြည့်အစုံရှိမရှိ စစ်ဆေးပေးပါ။`, 'HTML', null, botKeyValue);
    }
}

// Handle callback query for unmute
export async function handleUnmuteCallback(callbackQuery, token, env, botKeyValue) {
    const callbackData = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    await answerCallbackQuery(token, callbackQuery.id, "Unmute လုပ်နေပါပြီ...", true);

    const parts = callbackData.split('_');
    const targetUserId = parseInt(parts[1], 10);
    const targetChatId = parseInt(parts[2], 10);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await editMessageText(token, chatId, messageId, "❌ Unmute လုပ်ခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const success = await unrestrictChatMember(token, targetChatId, targetUserId, botKeyValue);
    if (success) {
        const targetUserDisplayName = callbackQuery.message.reply_to_message?.from?.first_name || `User_${targetUserId}`;
        const userLink = `<a href='tg://user?id=${targetUserDisplayName}'>${targetUserDisplayName}</a>`;
        await editMessageText(token, chatId, messageId, `✅ ${userLink} ကို စာပို့ခွင့် ပြန်ဖွင့်ပေးလိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await editMessageText(token, chatId, messageId, `❌ Unmute လုပ်မရပါ။ Bot တွင် Admin အခွင့်အရေး အပြည့်အစုံရှိမရှိ စစ်ဆေးပေးပါ။`, 'HTML', null, botKeyValue);
    }
}


// --- Handle /keyinfo command to retrieve VPN key details ---
export async function handleKeyInfoCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1); // Get arguments after the command

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/keyinfo <key_id>`", 'Markdown', null, botKeyValue);
        return;
    }

    const keyId = args[0]; // The unique ID of the key

    // Use the new getVpnKeyByUniqueId function to retrieve key details
    const keyDetails = await getVpnKeyByUniqueId(env, keyId);

    if (!keyDetails) {
        await sendMessage(token, chatId, `❌ Key ID: \`${keyId}\` အတွက် VPN Key အချက်အလက်ကို ရှာမတွေ့ပါ။`, 'Markdown', null, botKeyValue);
        return;
    }

    const vpnKeyData = keyDetails.vpnKeyData;
    const fullKey = keyDetails.fullKey; // The full key string (e.g., vpn_key:type:id)
    const keyParts = fullKey.split(':'); // Split fullKey to get operator and keyType
    const operatorCode = keyParts[1]; // Extract operator code
    const keyType = keyParts[2]; // Extract key type

    let messageText = `🔑 <b>VPN Key အချက်အလက်များ:</b>\n\n`;
    messageText += `Key ID: <code>${keyId}</code>\n`;
    messageText += `Operator: <b>${operatorCode}</b>\n`; // Display operator code
    messageText += `Key အမျိုးအစား: <b>${keyType.replace(/_/g, ' ')}</b>\n`;
    messageText += `Status: <b>${vpnKeyData.status}</b>\n`;
    messageText += `Key Content: <code>${vpnKeyData.key}</code>\n`; // Display the actual key content

    if (vpnKeyData.assigned_to) {
        messageText += `Assigned to User ID: <code>${vpnKeyData.assigned_to}</code>\n`;
    }
    if (vpnKeyData.expiration_time) {
        const expiryDate = new Date(vpnKeyData.expiration_time * 1000);
        messageText += `သက်တမ်းကုန်ဆုံးမည့်ရက်: ${toThaiDateTime(expiryDate.toISOString())}\n`;
    }
    if (vpnKeyData.created_at) {
        const createdAtDate = new Date(vpnKeyData.created_at);
        messageText += `ဖန်တီးခဲ့သည့်ရက်: ${toThaiDateTime(createdAtDate.toISOString())}\n`;
    }

    await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
}


// --- New Payment Verification Admin Commands ---

/**
 * Handles the /viewpayment command to view details of a pending payment.
 * This function handles message commands only.
 * @param {object} message - The Telegram message object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handleViewPaymentCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/viewpayment <transaction_id>`", 'Markdown', null, botKeyValue);
        return;
    }

    const transactionId = args[0];
    const paymentDetails = await getPaymentDetails(env, transactionId);

    if (!paymentDetails) {
        await sendMessage(token, chatId, `❌ Transaction ID: \`${transactionId}\` အတွက် ငွေပေးချေမှုမှတ်တမ်းကို ရှာမတွေ့ပါ။`, 'Markdown', null, botKeyValue);
        return;
    }

    let text = `💸 <b>ငွေပေးချေမှု အချက်အလက်များ:</b>\n\n`;
    text += `Transaction ID: <code>${transactionId}</code>\n`;
    text += `Status: <b>${paymentDetails.status}</b>\n`;
    text += `User ID: <code>${paymentDetails.userId}</code>\n`;
    text += `Item: <b>${paymentDetails.itemName}</b>\n`;
    text += `Amount: <b>${paymentDetails.amount}</b>\n`;
    text += `Timestamp: ${toThaiDateTime(paymentDetails.timestamp)}\n`;

    const inlineKeyboard = {
        inline_keyboard: [
            [{
                text: "✅ အတည်ပြုရန်",
                callback_data: `verify_payment_${transactionId}`
            }],
            [{
                text: "❌ ငြင်းပယ်ရန်",
                callback_data: `reject_payment_${transactionId}`
            }]
        ]
    };

    if (paymentDetails.photoFileId) {
        const photoCaption = text;
        await sendPhoto(token, chatId, paymentDetails.photoFileId, photoCaption, inlineKeyboard, botKeyValue);
    } else {
        await sendMessage(token, chatId, text, 'HTML', inlineKeyboard, botKeyValue);
    }
}

/**
 * Handles the callback query for viewing a payment from a button.
 * Callback format: view_payment_<transaction_id>
 */
export async function handleViewPaymentCallback(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const transactionId = callbackQuery.data.split('_')[2];
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "ငွေပေးချေမှု အချက်အလက်များကို ပြန်လည်ပြသပါမည်။", true);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await editMessageText(token, chatId, messageId, "❌ ဤလုပ်ဆောင်ချက်ကို လုပ်ပိုင်ခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const paymentDetails = await getPaymentDetails(env, transactionId);

    if (!paymentDetails) {
        await editMessageText(token, chatId, messageId, `❌ Transaction ID: <code>${transactionId}</code> အတွက် ငွေပေးချေမှုမှတ်တမ်းကို ရှာမတွေ့ပါ။`, 'HTML', null, botKeyValue);
        return;
    }

    let text = `💸 <b>ငွေပေးချေမှု အချက်အလက်များ:</b>\n\n`;
    text += `Transaction ID: <code>${transactionId}</code>\n`;
    text += `Status: <b>${paymentDetails.status}</b>\n`;
    text += `User ID: <code>${paymentDetails.userId}</code>\n`;
    text += `Item: <b>${paymentDetails.itemName}</b>\n`;
    text += `Amount: <b>${paymentDetails.amount}</b>\n`;
    text += `Timestamp: ${toThaiDateTime(paymentDetails.timestamp)}\n`;

    const inlineKeyboard = {
        inline_keyboard: [
            [{
                text: "✅ အတည်ပြုရန်",
                callback_data: `verify_payment_${transactionId}`
            }],
            [{
                text: "❌ ငြင်းပယ်ရန်",
                callback_data: `reject_payment_${transactionId}`
            }]
        ]
    };

    try {
        if (paymentDetails.photoFileId) {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            const photoCaption = text;
            await sendPhoto(token, chatId, paymentDetails.photoFileId, photoCaption, inlineKeyboard, botKeyValue);
        } else {
            await editMessageText(token, chatId, messageId, text, 'HTML', inlineKeyboard, botKeyValue);
        }
    } catch (e) {
        console.error(`[handleViewPaymentCallback] Failed to edit or resend message: ${e.message}`);
        await sendMessage(token, chatId, `❌ အမှားအယွင်းတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။ ကျေးဇူးပြု၍ command ဖြင့် ပြန်လည်စစ်ဆေးပါ။ <code>/viewpayment ${transactionId}</code>`, 'HTML', null, botKeyValue);
    }
}


/**
 * Handles the callback query for verifying a payment.
 * Callback format: verify_payment_<transaction_id>
 */
export async function handleVerifyPaymentCallback(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const transactionId = callbackQuery.data.split('_')[2];
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "ငွေပေးချေမှုကို အတည်ပြုနေပါပြီ...", true);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await editMessageText(token, chatId, messageId, "❌ ဤလုပ်ဆောင်ချက်ကို လုပ်ပိုင်ခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const paymentDetails = await getPaymentDetails(env, transactionId);

    if (!paymentDetails || paymentDetails.status !== 'awaiting_admin_review') {
        const errorMessage = `❌ ငွေပေးချေမှုမှတ်တမ်း ID: <code>${transactionId}</code> ကို အတည်ပြု၍မရပါ။ အခြေအနေ မှားယွင်းနေပါသည်။`;
        try {
            // MODIFIED: If it's a photo message, delete and send new text message. Otherwise, edit.
            if (callbackQuery.message.photo) {
                await deleteMessage(token, chatId, messageId, botKeyValue);
                await sendMessage(token, chatId, errorMessage, 'HTML', null, botKeyValue);
            } else {
                await editMessageText(token, chatId, messageId, errorMessage, 'HTML', null, botKeyValue);
            }
        } catch (e) {
            console.error(`[handleVerifyPaymentCallback] Error handling message update after error: ${e}`);
            await sendMessage(token, chatId, errorMessage, 'HTML', null, botKeyValue); // Fallback
        }
        return;
    }

    // MODIFIED: Retrieve operatorCode and keyType separately from paymentDetails
    const operatorCode = paymentDetails.operatorCode; // NEW: Get operatorCode
    const keyType = paymentDetails.itemId; // This is now just the keyType (e.g., DNS_30DAY)


    const availableKey = await findAvailableVpnKeyByType(env, operatorCode, keyType, 'available'); // MODIFIED: Pass operatorCode and keyType separately
    
    console.log(`[handleVerifyPaymentCallback] Found available key for type ${operatorCode}_${keyType}:`, availableKey);

    if (!availableKey) {
        const adminMessage = `❌ <b>Key ကုန်နေပါပြီ။</b>\n\n<code>${operatorCode}_${keyType}</code> အတွက် VPN key မရှိတော့ပါ။ နောက်မှ ထပ်ကြိုးစားကြည့်ပါ သို့မဟုတ် key အသစ်ထည့်ရန် admin ကို ဆက်သွယ်ပါ။`;
        try {
            // MODIFIED: If it's a photo message, delete and send new text message. Otherwise, edit.
            if (callbackQuery.message.photo) {
                await deleteMessage(token, chatId, messageId, botKeyValue);
                await sendMessage(token, chatId, adminMessage, 'HTML', null, botKeyValue);
            } else {
                await editMessageText(token, chatId, messageId, adminMessage, 'HTML', null, botKeyValue);
            }
        } catch (e) {
            console.error(`[handleVerifyPaymentCallback] Error handling message update after key not available: ${e}`);
            await sendMessage(token, chatId, adminMessage, 'HTML', null, botKeyValue); // Fallback
        }
        return;
    }

    await updatePaymentStatus(env, transactionId, 'verified');
    const fullKey = availableKey.keyId; 
    const vpnKey = availableKey.vpnKeyData.key;
    const expirationTime = Math.floor(Date.now() / 1000) + (30 * 24 * 3600); // 30 days
    await updateVpnKeyStatus(env, fullKey, 'sold', paymentDetails.userId, expirationTime);

    const userMessage = `✅ သင်၏ ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။\n\n` +
        `<b>${paymentDetails.itemName}</b> အတွက် key အသစ် ထုတ်ပေးလိုက်ပါတယ်။\n\n` +
        `Key: <code>${vpnKey}</code>\n` +
        `သက်တမ်း: ၃၀ ရက်\n\n` +
        `အဆင်မပြေမှုရှိပါက Admin ကို ဆက်သွယ်နိုင်ပါတယ်။`;
    try {
        // Send the VPN key to the user
        await sendMessage(token, paymentDetails.chatId, userMessage, 'HTML', null, botKeyValue);
        // NEW: Send the VPN guide button immediately after sending the key
        await sendMessage(token, paymentDetails.chatId, "အောက်ပါ ခလုတ်ကိုနှိပ်၍ VPN အသုံးပြုနည်းလမ်းညွှန်ကို ကြည့်ရှုနိုင်ပါသည်:", 'HTML', VPN_GUIDE_BUTTON(transactionId), botKeyValue);

    } catch (e) {
        console.error(`[handleVerifyPaymentCallback] Failed to send key to user ${paymentDetails.userId}: ${e.message}`);
        const failedMessage = `❌ User ID <code>${paymentDetails.userId}</code> ၏ Private Chat သို့ Key ပို့မရပါ။ User သည် Bot ကို Block လုပ်ထားခြင်း သို့မဟုတ် Private Chat မစတင်ထားခြင်း ဖြစ်နိုင်ပါသည်။ ကျေးဇူးပြု၍ Key ကို manual ပေးပါ။\n\nKey: <code>${vpnKey}</code>\n`;
        await sendMessage(token, chatId, failedMessage, 'HTML', null, botKeyValue);
    }

    // MODIFIED: Only the unique key ID is wrapped in <code> tags for easy copying.
    const keyIdOnly = fullKey.split(':').pop(); // Get the unique ID part
    const adminMessage = `✅ ငွေပေးချေမှုမှတ်တမ်း ID: <code>${transactionId}</code> ကို အောင်မြင်စွာ အတည်ပြုပြီးပါပြီ။\n\n` +
        `VPN Key ID: <code>${keyIdOnly}</code> ကို User ID: <code>${paymentDetails.userId}</code> သို့ ပို့ပေးလိုက်ပါပြီ။`;
    
    // MODIFIED: Ensure proper handling for photo messages vs. text messages
    if (callbackQuery.message.photo) {
        await deleteMessage(token, chatId, messageId, botKeyValue); // Delete the original photo message
        await sendMessage(token, chatId, adminMessage, 'HTML', null, botKeyValue); // Send a new text message
    } else {
        await editMessageText(token, chatId, messageId, adminMessage, 'HTML', null, botKeyValue); // Edit the existing text message
    }
}

/**
 * Handles the callback query for rejecting a payment.
 * Callback format: reject_payment_<transaction_id>
 */
export async function handleRejectPaymentCallback(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const transactionId = callbackQuery.data.split('_')[2];
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "ငွေပေးချေမှုကို ငြင်းပယ်နေပါပြီ...", true);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await editMessageText(token, chatId, messageId, "❌ ဤလုပ်ဆောင်ချက်ကို လုပ်ပိုင်ခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const paymentDetails = await getPaymentDetails(env, transactionId);

    if (!paymentDetails || paymentDetails.status !== 'awaiting_admin_review') {
        const errorMessage = `❌ ငွေပေးချေမှုမှတ်တမ်း ID: <code>${transactionId}</code> ကို ငြင်းပယ်၍မရပါ။ အခြေအနေ မှားယွင်းနေပါသည်။`;
        try {
            // MODIFIED: If it's a photo message, delete and send new text message. Otherwise, edit.
            if (callbackQuery.message.photo) {
                await deleteMessage(token, chatId, messageId, botKeyValue);
                await sendMessage(token, chatId, errorMessage, 'HTML', null, botKeyValue);
            } else {
                await editMessageText(token, chatId, messageId, errorMessage, 'HTML', null, botKeyValue);
            }
        } catch (e) {
            console.error(`[handleRejectPaymentCallback] Error handling message update after error: ${e}`);
            await sendMessage(token, chatId, errorMessage, 'HTML', null, botKeyValue); // Fallback
        }
        return;
    }

    await updatePaymentStatus(env, transactionId, 'rejected');

    const userMessage = `❌ ခွင့်လွှတ်ပါခင်ဗျာ။ သင်၏ ငွေပေးချေမှုပြေစာကို အတည်ပြု၍မရပါ။ ပြန်လည်စစ်ဆေးရန် လိုအပ်ပါသည်။\n\n` +
        `အကယ်၍ အမှားအယွင်းမရှိပါက Admin ကို ဆက်သွယ်ပေးပါ။`;

    // Add a button to contact the admin
    const replyMarkup = {
        inline_keyboard: [
            [{
                text: "Contact Admin",
                url: `https://t.me/${ADMIN_USERNAME.substring(1)}`
            }]
        ]
    };
    await sendMessage(token, paymentDetails.chatId, userMessage, 'HTML', replyMarkup, botKeyValue);

    const adminMessage = `❌ ငွေပေးချေမှုမှတ်တမ်း ID: <code>${transactionId}</code> ကို အောင်မြင်စွာ ငြင်းပယ်လိုက်ပါပြီ။`;

    // MODIFIED: Ensure proper handling for photo messages vs. text messages
    if (callbackQuery.message.photo) {
        await deleteMessage(token, chatId, messageId, botKeyValue); // Delete the original photo message
        await sendMessage(token, chatId, adminMessage, 'HTML', null, botKeyValue); // Send a new text message
    } else {
        await editMessageText(token, chatId, messageId, adminMessage, 'HTML', null, botKeyValue); // Edit the existing text message
    }
}

