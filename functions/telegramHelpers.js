// functions/telegramHelpers.js

import { TELEGRAM_API, OWNER_ADMIN_IDS } from './constants.js';

// All fetch calls to Telegram API must include the X-Bot-Key header.
// This ensures that your main control bot can validate the request.
// botKeyValue is passed from onRequest context.env.BOT_DATA
export async function sendMessage(token, chat_id, text, parse_mode = 'HTML', reply_markup = null, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/sendMessage`;
    // Ensure parse_mode is always passed and disable_web_page_preview is true by default
    const payload = { chat_id: chat_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendMessage] Sending message to ${chat_id}: ${text.substring(0, 50)}...`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Only send X-Bot-Key if botKeyValue is provided (for control bot validation)
                ...(botKeyValue && { "X-Bot-Key": botKeyValue }) 
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendMessage] Failed to send message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[sendMessage] Error sending message:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function deleteMessage(token, chat_id, message_id, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/deleteMessage`;
    const payload = { chat_id: chat_id, message_id: message_id };
    try {
        console.log(`[deleteMessage] Deleting message ${message_id} from chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[deleteMessage] Failed to delete message: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[deleteMessage] Error deleting message:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function getMe(token, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/getMe`;
    try {
        console.log("[getMe] Fetching bot info.");
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue }
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[getMe] Failed to get bot info: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok ? result.result : null;
    } catch (error) { console.error("[getMe] Error getting bot info:", error); return null; }
}

export async function restrictChatMember(token, chat_id, user_id, until_date = 0, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/restrictChatMember`;
    const payload = {
        chat_id: chat_id,
        user_id: user_id,
        permissions: {
            can_send_messages: false // Mute
        },
        until_date: until_date // 0 for permanent, or Unix timestamp
    };
    try {
        console.log(`[restrictChatMember] Restricting user ${user_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[restrictChatMember] Failed to restrict chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok;
    } catch (error) { console.error("[restrictChatMember] Error restricting chat member:", error); return false; }
}

export async function unrestrictChatMember(token, chat_id, user_id, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/restrictChatMember`;
    const payload = {
        chat_id: chat_id,
        user_id: user_id,
        permissions: {
            can_send_messages: true, // Unmute
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_change_info: true,
            can_invite_users: true,
            can_pin_messages: true,
            can_manage_topics: true
        }
    };
    try {
        console.log(`[unrestrictChatMember] Unrestricting user ${user_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[unrestrictChatMember] Failed to unrestrict chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok;
    } catch (error) { console.error("[unrestrictChatMember] Error unrestricting chat member:", error); return false; }
}

export async function kickChatMember(token, chat_id, user_id, until_date = 0, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/kickChatMember`;
    const payload = { chat_id: chat_id, user_id: user_id, until_date: until_date };
    try {
        console.log(`[kickChatMember] Kicking user ${user_id} from chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[kickChatMember] Failed to kick chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok;
    } catch (error) { console.error("[kickChatMember] Error kicking chat member:", error); return false; }
}

export async function unbanChatMember(token, chat_id, user_id, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/unbanChatMember`;
    const payload = { chat_id: chat_id, user_id: user_id };
    try {
        console.log(`[unbanChatMember] Unbanning user ${user_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[unbanChatMember] Failed to unban chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok;
    } catch (error) { console.error("[unbanChatMember] Error unbanning chat member:", error); return false; }
}

export async function getChatMember(token, chat_id, user_id, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/getChatMember`;
    const payload = { chat_id: chat_id, user_id: user_id };
    try {
        console.log(`[getChatMember] Getting chat member ${user_id} from chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[getChatMember] Failed to get chat member: ${response.status} ${JSON.stringify(result)}`); }
        return result.ok ? result.result : null;
    } catch (error) { console.error("[getChatMember] Error getting chat member:", error); return null; }
}

export async function answerCallbackQuery(token, callback_query_id, text = '', show_alert = false, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/answerCallbackQuery`;
    const payload = { callback_query_id: callback_query_id, text: text, show_alert: show_alert };
    try {
        console.log(`[answerCallbackQuery] Answering callback query ${callback_query_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[answerCallbackQuery] Failed to answer callback query: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[answerCallbackQuery] Error answering callback query:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function editMessageText(token, chat_id, message_id, text, parse_mode = 'HTML', reply_markup = null, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/editMessageText`;
    // Ensure parse_mode is always passed and disable_web_page_preview is true by default
    const payload = { chat_id: chat_id, message_id: message_id, text: text, parse_mode: parse_mode, disable_web_page_preview: true };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[editMessageText] Editing message ${message_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[editMessageText] Failed to edit message text: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[editMessageText] Error editing message text:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function editMessageReplyMarkup(token, chat_id, message_id, reply_markup = null, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/editMessageReplyMarkup`;
    const payload = { chat_id: chat_id, message_id: message_id };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[editMessageReplyMarkup] Editing reply markup for message ${message_id} in chat ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[editMessageReplyMarkup] Failed to edit message reply markup: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[editMessageReplyMarkup] Error editing message reply markup:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function sendDocument(token, chat_id, document, caption = '', reply_markup = null, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append('document', document);
    formData.append('caption', caption);
    // Add parse_mode to caption if needed, but for documents, it's usually plain text
    // formData.append('parse_mode', 'HTML'); 
    if (reply_markup) {
        formData.append('reply_markup', JSON.stringify(reply_markup));
    }

    try {
        console.log(`[sendDocument] Sending document to ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "X-Bot-Key": botKeyValue }, // FormData will set Content-Type automatically
            body: formData
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendDocument] Failed to send document: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[sendDocument] Error sending document:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function sendPhoto(token, chat_id, photo, caption = '', reply_markup = null, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/sendPhoto`;
    // Ensure parse_mode is always passed
    const payload = { chat_id: chat_id, photo: photo, caption: caption, parse_mode: 'HTML' };
    if (reply_markup) { payload.reply_markup = reply_markup; }
    try {
        console.log(`[sendPhoto] Sending photo to ${chat_id}.`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendPhoto] Failed to send photo: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[sendPhoto] Error sending photo:", error); return { ok: false, error_code: 500, description: error.message }; }
}

export async function sendMediaGroup(token, chat_id, media, botKeyValue) {
    const apiUrl = `${TELEGRAM_API}${token}/sendMediaGroup`;
    const payload = { chat_id: chat_id, media: media };
    try {
        console.log(`[sendMediaGroup] Sending media group to ${chat_id}. Media count: ${media.length}`);
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Bot-Key": botKeyValue },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) { console.error(`[sendMediaGroup] Failed to send media group: ${response.status} ${JSON.stringify(result)}`); }
        return result;
    } catch (error) { console.error("[sendMediaGroup] Error sending media group:", error); return { ok: false, error_code: 500, description: error.message }; }
}

// This function is no longer used for user data directly, but might be used for other KV operations.
// Keeping it for now as it was in the original structure
export async function deleteUserData(env, userId) {
    console.log(`[deleteUserData] Attempting to delete user data for user ID: ${userId}`);
    if (!env.USER_DATA) {
        console.error(`[deleteUserData] USER_DATA KV namespace is not bound. Cannot delete user data.`);
        return false;
    }
    try {
        await env.USER_DATA.delete(`user_data:${userId}`);
        console.log(`[deleteUserData] Deleted user data for user ID: ${userId}`);
        return true;
    } catch (error) {
        console.error(`[deleteUserData] Error deleting user data for user ID ${userId}:`, error);
        return false;
    }
}

// Helper function to check if a user is an admin in a given chat
export async function isUserAdmin(token, chatId, userId, isAnonymous = false, senderChatId = null, botKeyValue) {
    // Owner admins always have access
    if (OWNER_ADMIN_IDS.includes(userId)) {
        return true;
    }

    // If it's an anonymous admin, check if the sender_chat is an admin channel
    if (isAnonymous && senderChatId) {
        try {
            const chatMember = await getChatMember(token, chatId, senderChatId, botKeyValue);
            if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator')) {
                return true;
            }
        } catch (error) {
            console.error(`[isUserAdmin] Error checking anonymous admin status for senderChatId ${senderChatId}:`, error);
            return false;
        }
    }

    // For regular users, check their status in the chat
    try {
        const chatMember = await getChatMember(token, chatId, userId, botKeyValue);
        if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'creator')) {
            return true;
        }
    } catch (error) {
        console.error(`[isUserAdmin] Error checking admin status for userId ${userId}:`, error);
    }
    return false;
}

