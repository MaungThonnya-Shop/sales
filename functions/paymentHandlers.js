// functions/paymentHandlers.js
// ငွေပေးချေမှုနှင့် သက်ဆိုင်သော functions များကို ဤနေရာတွင် စုစည်းထားသည်

import {
    sendMessage,
    editMessageText,
    answerCallbackQuery,
    sendPhoto,
    getMe
} from './telegramHelpers.js';
import {
    KBANK_ACCOUNT_NAME,
    KBANK_ACCOUNT_NUMBER,
    KBANK_QR_CODE_FILE_ID,
    KBANK_QR_CODE_URL,
    OWNER_ADMIN_IDS,
    VIEW_PAYMENT_BUTTON,
    NO_IMAGE_PLACEHOLDER_FILE_ID // Import NO_IMAGE_PLACEHOLDER_FILE_ID
} from './constants.js';
import {
    storePaymentDetails,
    getPaymentDetails,
    updatePaymentStatus,
    getVpnKey,
    listKeys,
    deleteData
} from './dataStorage.js';


// Function to generate a simple unique ID for transactions
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// New PAYMENT_INSTRUCTION_TEXT function for sending photo or URL
const getPaymentInstructionDetails = (itemName, price, itemDescription = null) => {
    // HTML formatting ကို သေချာစေရန် escape လုပ်ထားသည်
    let text = `<b>${itemName}</b> အတွက် ငွေပေးချေရန် အောက်ပါ ဘဏ်အချက်အလက်များကို အသုံးပြုနိုင်ပါတယ်:\n\n` +
        `ဘဏ်အမည်: <b>𝗞𝗮𝘀𝗶𝗸𝗼𝗿𝗻 (𝗞-𝗕𝗮𝗻𝗸)</b>\n` +
        `အကောင့်အမည်: <b>${KBANK_ACCOUNT_NAME}</b>\n` +
        `အကောင့်နံပါတ်: <b>${KBANK_ACCOUNT_NUMBER}</b>\n` +
        `ပမာဏ: <b>${price}</b>\n\n`; // MODIFIED: Ensure price is used here
    
    if (itemDescription) {
        text += `<b>အသေးစိတ်ဖော်ပြချက်:</b> ${itemDescription}\n\n`;
    }

    text += `ငွေလွှဲပြီးပါက ငွေလွှဲပြေစာ (Transaction Slip) ၏ screenshot ကို ဤ Bot သို့ ပြန်ပို့ပေးပါ။ ကျွန်တော်တို့ စစ်ဆေးပြီး အတည်ပြုပေးပါမယ်။\n\n` +
            `<b>မှတ်ချက်:</b> ငွေလွှဲပြေစာကို သေချာစစ်ဆေးပြီးမှ ဝန်ဆောင်မှုပေးမှာဖြစ်ပါတယ်။`;

    if (KBANK_QR_CODE_FILE_ID) {
        text += `\n\nQR Code ဖြင့် ပေးချေလိုပါက အောက်ပါ QR Code ကို အသုံးပြုနိုင်ပါတယ်။`;
        return {
            text: text,
            fileId: KBANK_QR_CODE_FILE_ID,
            type: 'photo'
        };
    } else if (KBANK_QR_CODE_URL) {
        text += `\n\nQR Code ဖြင့် ပေးချေလိုပါက အောက်ပါ Link ကို နှိပ်ပြီး QR Code ကို ကြည့်ရှုနိုင်ပါတယ်: <a href="${KBANK_QR_CODE_URL}">KBank QR Code</a>`;
        return {
            text: text,
            fileId: null,
            type: 'url'
        };
    }
    return {
        text: text,
        fileId: null,
        type: 'text'
    };
};

// Functions exported for use in other files
export { getPaymentInstructionDetails };

/**
 * Finds an available VPN key of a specific type.
 * This function is now EXPORTED from here for use in other handlers like adminHandlers.js
 * MODIFIED: Now accepts operatorCode as a separate parameter.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The operator code (e.g., 'DTAC', 'TRUE').
 * @param {string} keyType - The type of VPN key to find.
 * @param {string} status - The status to look for (e.g., 'available', 'trial').
 * @returns {Promise<object|null>} - { keyId: string, vpnKeyData: object } or null.
 */
export async function findAvailableVpnKeyByType(env, operatorCode, keyType, status = 'available') {
    // MODIFIED: Prefix now includes operatorCode
    const allKeys = await listKeys(env, 'SALES_DATA', `vpn_key:${operatorCode}:${keyType}:`);
    for (const fullKey of allKeys) {
        const vpnKeyData = await getVpnKey(env, fullKey);
        if (vpnKeyData && vpnKeyData.status === status) {
            return {
                keyId: fullKey,
                vpnKeyData: vpnKeyData
            };
        }
    }
    return null;
}


/**
 * Handles the payment initiation flow for both VPN VIP keys and game items.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 * @param {object} itemDetails - An object containing details about the item being purchased.
 * @param {string} itemDetails.itemName - The name of the item.
 * @param {string} itemDetails.itemType - The type of the item ('vpn', 'mlbb', 'pubg').
 * @param {string} itemDetails.itemId - The unique ID of the item (for VPN, this is now just keyType).
 * @param {string|null} itemDetails.operatorCode - NEW: The operator code for VPN items.
 * @param {string} itemDetails.backCallbackData - The callback data for the 'back' button.
 * @param {string} itemDetails.initialMessageId - The message ID of the original message.
 * @param {string} itemDetails.initialChatId - The chat ID of the original message.
 * @param {string} itemDetails.userId - The user's ID.
 * @param {string|null} itemDetails.itemFileId - Optional: Telegram file_id for the product's image.
 * @param {string|null} itemDetails.itemDescription - Optional: Detailed description of the product.
 * @param {string} itemDetails.itemPrice - NEW: The price of the item.
 */
export async function handlePaymentInitiation(callbackQuery, token, env, botKeyValue, itemDetails) {
    const {
        itemName,
        itemType,
        itemId, // This is now just the keyType for VPN
        operatorCode, // NEW: Operator code for VPN
        backCallbackData,
        initialMessageId,
        initialChatId,
        userId,
        itemFileId,
        itemDescription,
        itemPrice // NEW: Directly receive itemPrice
    } = itemDetails;

    await answerCallbackQuery(token, callbackQuery.id, `"${itemName}" ဝယ်ယူရန် အချက်အလက်များ ပြသပါမည်။`, true);

    const transactionId = generateUniqueId();

    // Pass itemDescription and itemPrice to getPaymentInstructionDetails
    const paymentInstruction = getPaymentInstructionDetails(itemName, itemPrice, itemDescription); // MODIFIED: Pass itemPrice directly

    // Store payment details for later verification
    await storePaymentDetails(env, transactionId, {
        userId: userId.toString(),
        chatId: userId.toString(), 
        originalChatId: initialChatId.toString(),
        itemId: itemId, // This is now just the keyType for VPN
        itemType: itemType,
        itemName: itemName,
        amount: itemPrice, // MODIFIED: Store the correctly passed itemPrice
        status: 'pending',
        timestamp: new Date().toISOString(),
        photoFileId: itemFileId, // Store the product's image file ID with the transaction
        operatorCode: operatorCode // NEW: Store operatorCode for VPN items
    });

    // --- Private Chat သို့ QR ပို့ခြင်းအတွက် Error Handling ပါဝင် ---
    const privateChatButtons = {
        inline_keyboard: [
            [{
                text: "✅ ငွေလွှဲပြီးပါပြီ (ပုံပို့ရန်)",
                callback_data: `payment_confirm_${transactionId}`
            }],
            [{
                text: "↩️ နောက်သို့",
                callback_data: backCallbackData
            }]
        ]
    };

    let sentToPrivate = false;
    try {
        // FIX: Always prioritize KBANK_QR_CODE_FILE_ID for payment instructions
        const photoToSend = paymentInstruction.fileId || NO_IMAGE_PLACEHOLDER_FILE_ID; 
        const captionText = paymentInstruction.text;

        if (photoToSend) {
            const result = await sendPhoto(token, userId, photoToSend, captionText, privateChatButtons, botKeyValue);
            sentToPrivate = result.ok;
        } else {
            // If no photo to send (neither product image nor QR), just send the message
            const result = await sendMessage(token, userId, captionText, 'HTML', privateChatButtons, botKeyValue);
            sentToPrivate = result.ok;
        }
    } catch (e) {
        console.error(`[handlePaymentInitiation] Failed to send to private chat for user ${userId}: ${e.message}`);
        await sendMessage(token, initialChatId, `❌ သင်၏ Private Chat သို့ ငွေပေးချေမှု အချက်အလက်များကို ပို့၍မရပါ။ ကျေးဇူးပြု၍ Bot ကို Private Chat (ဥပမာ: /start ဟု ပို့ခြင်း) တွင် စကားပြောပြီးမှ ထပ်မံကြိုးစားပါ။`, 'HTML', null, botKeyValue);
        return;
    }

    if (sentToPrivate) {
        const botInfo = await getMe(token, botKeyValue);
        const finalMessageText = `<b>${itemName}</b> ဝယ်ယူရန်အတွက် ငွေပေးချေမှု အချက်အလက်များကို သင့် <b>Private Chat</b> သို့ ပေးပို့ထားပါသည်။ ကျေးဇူးပြု၍ စစ်ဆေးပါ။`;
        const finalMessageButtons = {
            inline_keyboard: [
                [{
                    text: "💬 Bot Private Chat သို့ သွားရန်",
                    url: `https://t.me/${botInfo.username}`
                }],
                [{
                    text: "↩️ နောက်သို့",
                    callback_data: backCallbackData
                }]
            ]
        };
        await editMessageText(token, initialChatId, initialMessageId, finalMessageText, 'HTML', finalMessageButtons, botKeyValue);
    } else {
        await sendMessage(token, initialChatId, `❌ ငွေပေးချေမှု အချက်အလက်များကို ပို့၍မရပါ။ ကျေးဇူးပြု၍ နောက်မှ ထပ်မံကြိုးစားကြည့်ပါ သို့မဟုတ် Admin ကို ဆက်သွယ်ပါ။`, 'HTML', null, botKeyValue);
    }
}


/**
 * Handles the 'payment_confirm' callback query from a user.
 * This is triggered when a user confirms they have made a payment.
 * @param {object} callbackQuery - The Telegram callback query object.
 * @param {string} token - The Telegram bot token.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handlePaymentConfirmCallback(callbackQuery, token, botKeyValue) {
    const data = callbackQuery.data; // e.g., 'payment_confirm_<transaction_id>'
    const transactionId = data.split('_')[2];
    const userId = callbackQuery.from.id;

    await answerCallbackQuery(token, callbackQuery.id, "ငွေလွှဲပြေစာပုံကို ပို့ပေးပါ။", true);

    const paymentDetails = await getPaymentDetails(callbackQuery.env, transactionId);

    if (paymentDetails && paymentDetails.userId === userId.toString() && paymentDetails.status === 'pending') {
        // The status is already 'pending'. We just need to ensure the user is prompted.
        console.log(`[handlePaymentConfirmCallback] Transaction ${transactionId} is pending. Waiting for photo from user ${userId}.`);
    } else {
        await sendMessage(token, userId, "❌ ငွေပေးချေမှုမှတ်တမ်းကို ရှာမတွေ့ပါ သို့မဟုတ် အခြေအနေ မှားယွင်းနေပါသည်။ ကျေးဇူပြု၍ ဝန်ဆောင်မှုကို ပြန်လည်စတင်ပါ။", 'HTML', null, botKeyValue);
    }
}


/**
 * Handle incoming photo message (potential payment proof or just a photo).
 * This function will now also send back the file_id of any photo received in private chat.
 * @param {object} update - The Telegram update object containing the message.
 * @param {string} token - The Telegram bot token.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} botKeyValue - The bot key for API calls.
 */
export async function handleIncomingPhoto(update, token, env, botKeyValue) {
    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const photo = message.photo;
    const caption = message.caption || '';
    const botInfo = await getMe(token, botKeyValue);

    if (!photo || photo.length === 0) {
        console.log("[handleIncomingPhoto] No photo found in message.");
        // If it's not a photo, just return or handle other message types if needed.
        return;
    }

    // REMOVED: The condition to check if chat is private.
    // Now, photos from group chats will be ignored without sending a message.
    // Photos from private chats will proceed to the rest of the logic.
    if (message.chat.type !== 'private') {
        console.log(`[handleIncomingPhoto] Ignoring photo from non-private chat (${message.chat.type}).`);
        return;
    }


    // Get the largest photo available
    const fileId = photo[photo.length - 1].file_id;
    console.log(`[handleIncomingPhoto] Received photo with file_id: ${fileId} from user ${userId}`);

    // --- NEW: Send back the file_id to the user if it's an admin ---
    if (OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, `✅ သင်ပို့လိုက်သော ပုံ၏ File ID: \n<code>${fileId}</code>`, 'HTML', null, botKeyValue);
        // Admin က ပုံ File ID ရချင်လို့ ပို့တာဖြစ်နိုင်တာကြောင့် ဒီမှာပဲ ရပ်လိုက်ပါမယ်။
        // Admin က ငွေလွှဲပြေစာ ပုံပို့တာဆိုရင်တော့ အောက်က logic ကို ဆက်သွားပါမယ်။
        // ဒါပေမယ့် Admin က ပုံ File ID ရချင်လို့ ပို့တာဆိုရင် ဒီမှာပဲ ပြီးဆုံးအောင် လုပ်တာ ပိုကောင်းပါတယ်။
        // Admin က ငွေလွှဲပြေစာ ပို့တာဆိုရင်တော့ /viewpayment command ကို သုံးပြီး လုပ်ဆောင်နိုင်ပါတယ်။
        return; 
    }
    // --- END NEW ---


    // Find the latest pending transaction for this user in their private chat
    const allPaymentKeys = await env.SALES_DATA.list({
        prefix: 'payment:'
    });
    let linkedTransactionId = null;
    let paymentDetails = null;

    const userPendingTransactions = [];
    for (const key of allPaymentKeys.keys) {
        const transaction = await env.SALES_DATA.get(key.name, {
            type: 'json'
        });
        if (transaction && transaction.userId === userId.toString() && transaction.status === 'pending') {
            userPendingTransactions.push({
                id: key.name.replace('payment:', ''),
                details: transaction
            });
        }
    }

    userPendingTransactions.sort((a, b) => new Date(b.details.timestamp) - new Date(a.details.timestamp));

    if (userPendingTransactions.length > 0) {
        linkedTransactionId = userPendingTransactions[0].id;
        paymentDetails = userPendingTransactions[0].details;
    }


    if (linkedTransactionId && paymentDetails) {
        // Update transaction with photo file_id and change status
        paymentDetails.photoFileId = fileId; // This is the user's payment proof photo
        paymentDetails.caption = caption;
        paymentDetails.status = 'awaiting_admin_review';
        await storePaymentDetails(env, linkedTransactionId, paymentDetails);
        console.log(`[handleIncomingPhoto] Linked photo to pending transaction ${linkedTransactionId}.`);

        // User ကို အကြောင်းကြားစာပို့ခြင်း
        await sendMessage(token, chatId, `✅ သင်၏ ငွေလွှဲပြေစာ ပုံကို လက်ခံရရှိပါပြီ။\n\n` +
            `ကျွန်တော်တို့ အနေနဲ့ စစ်ဆေးအတည်ပြုပြီးတာနဲ့ အကြောင်းကြားပေးပါမယ်။ ကျေးဇူးပြု၍ ခဏစောင့်ဆိုင်းပေးပါ။`, 'HTML', null, botKeyValue);

        // Admin ကို Notification ပို့ခြင်း
        for (const adminId of OWNER_ADMIN_IDS) {
            const adminMessage = `🔔 <b>ငွေလွှဲပြေစာအသစ် ရောက်ရှိလာပါပြီ။</b>\n\n` +
                `Transaction ID: <code>${linkedTransactionId}</code>\n` +
                `User ID: <code>${paymentDetails.userId}</code>\n` +
                `Item: <b>${paymentDetails.itemName}</b>\n` +
                `ပမာဏ: <b>${paymentDetails.amount}</b>\n\n` + // MODIFIED: Use paymentDetails.amount
                `<b>🗽မောင်သုည - အကောင်းဆုံး နဲ့ မြန်ဆန်သော ဒစ်ဂျစ်တယ် ဝန်ဆောင်မှု⚡⚡⚡</b>`;

            await sendMessage(token, adminId, adminMessage, 'HTML', VIEW_PAYMENT_BUTTON(linkedTransactionId), botKeyValue); // Changed to HTML parse mode
        }

    } else {
        // If no pending transaction found for this user, it's an unlinked photo
        await sendMessage(token, chatId, `ပုံကို လက်ခံရရှိပါပြီခင်ဗျာ။ ဤပုံသည် မည်သည့် ဝန်ဆောင်မှုနှင့် ဆိုင်ကြောင်း မသိရသေးပါ။ ကျေးဇူးပြု၍ ဝန်ဆောင်မှုတစ်ခုခု ဝယ်ယူထားခြင်းဖြစ်ပါက သက်ဆိုင်ရာ ဝန်ဆောင်မှုမှ ငွေလွှဲပြေစာပုံကို ပို့ပေးပါ။`, 'HTML', null, botKeyValue);
    }
}
