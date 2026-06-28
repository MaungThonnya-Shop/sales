// functions/_middleware.js

// constants.js မှ variables များကို import လုပ်ပါ။
import {
    TELEGRAM_API,
    ADMIN_USERNAME,
    SUPPORT_GROUP_LINK,
    OWNER_ADMIN_IDS,
    DEFAULT_WELCOME_MESSAGE,
    MAIN_MENU_BUTTONS,
    CONTROL_BOT_URL
} from './constants.js';

// telegramHelpers.js မှ functions များကို import လုပ်ပါ။
import {
    sendMessage,
    getMe,
    answerCallbackQuery,
    deleteUserData,
    kickChatMember,
    restrictChatMember,
    unbanChatMember,
    unrestrictChatMember,
    sendDocument,
    sendPhoto,
    getChatMember,
    editMessageText,
    deleteMessage
} from './telegramHelpers.js';

// dataStorage.js မှ functions များကို import လုပ်ပါ။
import {
    getPaymentDetails,
    getWelcomeMessage,
    getWelcomePhoto,
    deleteUserDataFromKV
} from './dataStorage.js';

// salesHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleStartAndMenuCommand,
    handleMainMenuCallback,
    handleVpnBuyRequest,
    handleVpnOperatorSelection,
    handleVpnKeyTypeSelection,
    handleVpnFinalKeySelection,
    handleGameItemBuyRequest,
    handleInitiatePaymentCallback
} from './salesHandlers.js';

// adminHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleIdCommand,
    handleInfoCommand,
    handleBanCommand,
    handleMuteCommand,
    handleUnmuteCallback,
    handleViewPaymentCommand,
    handleVerifyPaymentCallback,
    handleRejectPaymentCallback,
    handleViewPaymentCallback as handleViewPaymentCallbackForAdmin,
    handleKeyInfoCommand
} from './adminHandlers.js';

// managementHandlers.js မှ functions များကို import လုပ်ပါ
import {
    handleAddVpnCommand,
    handleDeleteVpnCommand,
    handleListVpnsCommand,
    handleResetTrialCommand,
    handleSetPriceCommand,
    handleDeletePriceCommand,
    handleListPricesCommand,
    handleSetWelcomeMessageCommand,
    handleDeleteWelcomeMessageCommand,
    handleSetWelcomePhotoCommand,
    handleDeleteWelcomePhotoCommand,
    handleSetOperatorButtonCommand,
    handleDeleteOperatorButtonCommand,
    handleListOperatorButtonsCommand
} from './managementHandlers.js';

// paymentHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handlePaymentConfirmCallback,
    handleIncomingPhoto
} from './paymentHandlers.js';

// vpnGuideHandlers.js မှ functions များကို import လုပ်ပါ။
import {
    handleAddVpnGuideCommand,
    handleDeleteVpnGuideCommand,
    handleListVpnGuidesCommand,
    handleShowVpnGuideMenu,
    handleShowSpecificVpnGuide
} from './vpnGuideHandlers.js';


// Global variable to store bot ID after first fetch for efficient passive mode check
let botInfoCache = null;

// Function to get bot info (cached)
async function getBotInfo(token, botKeyValue) {
    if (!botInfoCache) {
        botInfoCache = await getMe(token, botKeyValue);
    }
    return botInfoCache;
}


// Main entry point for Cloudflare Worker
export async function onRequest(context) {
    const {
        request,
        env
    } = context;
    const url = new URL(request.url);
    const token = env.TELEGRAM_BOT_TOKEN;
    const botKeyValue = env.BOT_DATA;

    console.log(`[onRequest] Received request: ${request.method} ${request.url}`);

    let requestBody = {};
    try {
        if (request.method === "POST" && request.headers.get("content-type")?.includes("application/json")) {
            requestBody = await request.clone().json();
            console.log("[onRequest] Full incoming request body:", JSON.stringify(requestBody, null, 2));
        } else {
            console.log("[onRequest] Request headers (non-JSON/non-POST):", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
        }
    } catch (e) {
        console.error("[onRequest] Failed to parse request body as JSON:", e.message);
        console.log("[onRequest] Request headers (body parse error):", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    }

    if (!token) {
        console.error("[onRequest] Error: TELEGRAM_BOT_TOKEN environment variable is not set.");
        return new Response("TELEGRAM_BOT_TOKEN environment variable is not set.", {
            status: 500
        });
    }

    // --- Public User Bot Access Control (Validation via Control Bot) ---
    // This block checks if BOT_DATA is set and if the key is valid by calling the control bot.
    // If CONTROL_BOT_URL is not set, it will skip validation (for development).
    if (CONTROL_BOT_URL && CONTROL_BOT_URL !== "https://master-control.pages.dev/") {
        if (!botKeyValue) {
            console.warn("[onRequest] BOT_DATA environment variable is not set. Access denied for VPN Sales Bot.");
            let chatId = null;
            if (requestBody.message) {
                chatId = requestBody.message.chat.id;
            } else if (requestBody.callback_query && requestBody.callback_query.message) {
                chatId = requestBody.callback_query.message.chat.id;
            }

            if (chatId) {
                const userFriendlyMessage = `
<b>🚨 Bot Service အလုပ်မလုပ်တော့ပါ 🚨</b>

Bot Key ကို မှန်ကန်စွာ သတ်မှတ်ထားခြင်း မရှိပါ။ ကျေးဇူးပြု၍ Bot Owner ကို ဆက်သွယ်ပါ။
                `;
                const reply_markup = {
                    inline_keyboard: [
                        [{ text: "👤 Bot Owner ကို ဆက်သွယ်ရန်", url: `https://t.me/${ADMIN_USERNAME.substring(1)}` }],
                        [{ text: "👥 ပံ့ပိုးကူညီမှု Group သို့ ဝင်ရန်", url: SUPPORT_GROUP_LINK }]
                    ]
                };
                await sendMessage(token, chatId, userFriendlyMessage, 'HTML', reply_markup, botKeyValue);
            }
            return new Response("OK", { status: 200 });
        }

        // FIX: Corrected validation request to Control Bot
        // The control bot expects a POST request to /validate with bot_key in the body
        try {
            const validationResponse = await fetch(`${CONTROL_BOT_URL}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Key': botKeyValue
                },
                body: JSON.stringify({
                    bot_key: botKeyValue
                })
            });

            // If the response is not 200 OK, the key is invalid or deactivated
            if (!validationResponse.ok) {
                const errorText = await validationResponse.text();
                console.warn(`[onRequest] VPN Sales Bot Access Denied by Control Bot: ${validationResponse.status} - ${errorText}`);

                let chatId = null;
                if (requestBody.message) {
                    chatId = requestBody.message.chat.id;
                } else if (requestBody.callback_query && requestBody.callback_query.message) {
                    chatId = requestBody.callback_query.message.chat.id;
                }

                if (chatId) {
                    const userFriendlyMessage = `
<b>🚨 Bot Service သတိပေးချက် 🚨</b>

⚠️ သင်အသုံးပြုနေသော Bot သည် သက်တမ်းကုန်ဆုံးသွားခြင်း (သို့မဟုတ်) ပိတ်သိမ်းထားခြင်း
ခံရပါသည်။

အသေးစိတ်သိရှိလိုပါက Bot Owner ကို ဆက်သွယ်နိူင်ပါသည်။
                    `;
                    const reply_markup = {
                        inline_keyboard: [
                            [{ text: "👤 Bot Owner ကို ဆက်သွယ်ရန်", url: `https://t.me/${ADMIN_USERNAME.substring(1)}` }],
                            [{ text: "👥 ပံ့ပိုးကူညီမှု Group သို့ ဝင်ရန်", url: SUPPORT_GROUP_LINK }]
                        ]
                    };
                    await sendMessage(token, chatId, userFriendlyMessage, 'HTML', reply_markup, botKeyValue);
                }

                return new Response("OK", { status: 200 });
            }
            
            // If validation is successful, log it and continue
            const validationResult = await validationResponse.json();
            console.log(`[onRequest] VPN Sales Bot key ${botKeyValue} validated by Control Bot. Response:`, validationResult);
            
        } catch (error) {
            console.error(`[onRequest] Error validating bot key with control bot: ${error.message}`);
            // If control bot is unreachable, allow the bot to continue (fail-open)
            // For production, it's better to fail-closed to ensure security.
            // Uncomment the following lines to fail-closed:
            /*
            let chatId = null;
            if (requestBody.message) { chatId = requestBody.message.chat.id; }
            else if (requestBody.callback_query && requestBody.callback_query.message) { chatId = requestBody.callback_query.message.chat.id; }
            if (chatId) {
                await sendMessage(token, chatId, "⚠️ Control Bot နှင့် ဆက်သွယ်၍မရပါ။ ခဏအကြာ ထပ်မံကြိုးစားပါ။", 'HTML', null, botKeyValue);
            }
            return new Response("OK", { status: 200 });
            */
        }
    } else {
        console.log("[onRequest] CONTROL_BOT_URL not set or is placeholder. Skipping validation.");
    }
    // --- End Public User Bot Access Control ---

    // --- Handle Webhook Registration/Unregistration Routes ---
    if (request.method === "GET" && url.pathname.endsWith("/registerWebhook")) {
        const pagesUrl = url.origin + url.pathname.replace("/registerWebhook", "/webhook");
        console.log(`[onRequest] Registering webhook for user's bot to Telegram: ${pagesUrl}`);
        const setWebhookApiUrl = `${TELEGRAM_API}${token}/setWebhook`;
        const payload = {
            url: pagesUrl,
            allowed_updates: ["message", "callback_query", "my_chat_member"]
        };
        try {
            const response = await fetch(setWebhookApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok && result.ok) {
                console.log("[onRequest] Webhook registration successful:", result);
                return new Response(`Webhook registered to: ${pagesUrl} (Success: ${result.ok})`, {
                    status: 200
                });
            } else {
                console.error("[onRequest] Webhook registration failed:", result);
                return new Response(`Webhook registration failed: ${result.description || JSON.stringify(result)}`, {
                    status: 500
                });
            }
        } catch (error) {
            console.error("[onRequest] Error during webhook registration fetch:", error);
            return new Response(`Error registering webhook: ${error.message}`, {
                status: 500
            });
        }
    } else if (request.method === "GET" && url.pathname.endsWith("/unregisterWebhook")) {
        const deleteWebhookApiUrl = `${TELEGRAM_API}${token}/deleteWebhook`;
        try {
            const response = await fetch(deleteWebhookApiUrl);
            const result = await response.json();
            if (response.ok && result.ok) {
                console.log("[onRequest] Webhook unregistered successfully:", result);
                return new Response(`Webhook unregistered (Success: ${result.ok})`, {
                    status: 200
                });
            } else {
                console.error("[onRequest] Webhook unregistration failed:", result);
                return new Response(`Webhook unregistration failed: ${result.description || JSON.stringify(result)}`, {
                    status: 500
                });
            }
        } catch (error) {
            console.error("[onRequest] Error during webhook unregistration fetch:", error);
            return new Response(`Error unregistering webhook: ${error.message}`, {
                status: 500
            });
        }
    }

    // --- Main Telegram Update Handling (POST requests from Telegram) ---
    if (request.method === "POST" && url.pathname === '/webhook') {
        try {
            const update = requestBody;

            if (Object.keys(update).length === 0) {
                console.warn("[onRequest] Received an empty or unparseable Telegram update body. Skipping processing.");
                return new Response("OK - Empty update received", {
                    status: 200
                });
            }

            // Message Handling
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const userId = message.from.id;
                const messageText = message.text || '';

                console.log(`[onRequest] Handling message update from user ${userId} in chat ${chatId}.`);

                // Handle incoming photos (for payment proof or file_id request)
                if (message.photo) {
                    await handleIncomingPhoto(update, token, env, botKeyValue);
                    return new Response("OK", { status: 200 });
                }

                // Command Handling
                if (messageText.startsWith('/')) {
                    const command = messageText.split(' ')[0].toLowerCase();

                    // Public Commands (accessible by anyone)
                    if (command === '/start' || command === '/menu' || command === '/shop') {
                        await handleStartAndMenuCommand(token, chatId, message.message_id, botKeyValue, false, env);
                    }
                    // Admin Commands (only for OWNER_ADMIN_IDS)
                    else if (OWNER_ADMIN_IDS.includes(userId)) {
                        switch (command) {
                            case '/id':
                                await handleIdCommand(message, token, botKeyValue);
                                break;
                            case '/info':
                                await handleInfoCommand(message, token, env, botKeyValue);
                                break;
                            case '/ban':
                            case '/kick':
                                await handleBanCommand(message, token, botKeyValue);
                                break;
                            case '/mute':
                                await handleMuteCommand(message, token, botKeyValue);
                                break;
                            case '/addvpn':
                                await handleAddVpnCommand(message, token, env, botKeyValue);
                                break;
                            case '/deletevpn':
                                await handleDeleteVpnCommand(message, token, env, botKeyValue);
                                break;
                            case '/listvpns':
                                await handleListVpnsCommand(message, token, env, botKeyValue);
                                break;
                            case '/resettrial':
                                await handleResetTrialCommand(message, token, env, botKeyValue);
                                break;
                            case '/setprice':
                                await handleSetPriceCommand(message, token, env, botKeyValue);
                                break;
                            case '/deleteprice':
                                await handleDeletePriceCommand(message, token, env, botKeyValue);
                                break;
                            case '/listprices':
                                await handleListPricesCommand(message, token, env, botKeyValue);
                                break;
                            case '/viewpayment':
                                await handleViewPaymentCommand(message, token, env, botKeyValue);
                                break;
                            case '/setwelcomemessage':
                                await handleSetWelcomeMessageCommand(message, token, env, botKeyValue);
                                break;
                            case '/deletewelcomemessage':
                                await handleDeleteWelcomeMessageCommand(message, token, env, botKeyValue);
                                break;
                            case '/setwelcomephoto':
                                await handleSetWelcomePhotoCommand(message, token, env, botKeyValue);
                                break;
                            case '/deletewelcomephoto':
                                await handleDeleteWelcomePhotoCommand(message, token, env, botKeyValue);
                                break;
                            case '/keyinfo':
                                await handleKeyInfoCommand(message, token, env, botKeyValue);
                                break;
                            case '/setoperatorbutton':
                                await handleSetOperatorButtonCommand(message, token, env, botKeyValue);
                                break;
                            case '/deleteoperatorbutton':
                                await handleDeleteOperatorButtonCommand(message, token, env, botKeyValue);
                                break;
                            case '/listoperatorbuttons':
                                await handleListOperatorButtonsCommand(message, token, env, botKeyValue);
                                break;
                            case '/addvpnguide':
                                await handleAddVpnGuideCommand(message, token, env, botKeyValue);
                                break;
                            case '/deletevpnguide':
                                await handleDeleteVpnGuideCommand(message, token, env, botKeyValue);
                                break;
                            case '/listvpnguides':
                                await handleListVpnGuidesCommand(message, token, env, botKeyValue);
                                break;
                            default:
                                await sendMessage(token, chatId, "မသိသော Admin Command ဖြစ်ပါသည်။", 'HTML', null, botKeyValue);
                                break;
                        }
                    } else {
                        if (message.chat.type === 'private') {
                            await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS }, botKeyValue);
                        }
                        console.log(`[onRequest] Ignoring unknown command from non-admin: ${command}`);
                    }
                } else {
                    if (message.chat.type === 'private') {
                        await sendMessage(token, chatId, DEFAULT_WELCOME_MESSAGE, 'HTML', { inline_keyboard: MAIN_MENU_BUTTONS }, botKeyValue);
                    }
                    console.log("[onRequest] Ignoring non-command, non-photo message.");
                }

            } else if (update.callback_query) {
                const callbackQuery = update.callback_query;
                const data = callbackQuery.data;
                const chatId = callbackQuery.message.chat.id;
                const messageId = callbackQuery.message.message_id;
                const userId = callbackQuery.from.id;

                callbackQuery.env = env;

                if (data === 'main_menu' || data.startsWith('menu_')) {
                    await handleMainMenuCallback(callbackQuery, token, botKeyValue);
                } else if (data === 'vpn_buy') {
                    await handleVpnBuyRequest(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('vpn_buy_')) {
                    await handleVpnFinalKeySelection(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('vpn_operator_select_')) {
                    await handleVpnOperatorSelection(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('vpn_key_type_')) {
                    await handleVpnKeyTypeSelection(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('vpn_select_trial_') || data.startsWith('vpn_select_buy_')) {
                    await handleVpnFinalKeySelection(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('mlbb_buy_') || data.startsWith('pubg_buy_')) {
                    await handleGameItemBuyRequest(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('confirm_initiate_payment_')) {
                    await handleInitiatePaymentCallback(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('payment_confirm_')) {
                    await handlePaymentConfirmCallback(callbackQuery, token, botKeyValue);
                } else if (data.startsWith('view_payment_')) {
                    await handleViewPaymentCallbackForAdmin(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('verify_payment_')) {
                    await handleVerifyPaymentCallback(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('reject_payment_')) {
                    await handleRejectPaymentCallback(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('unmute_')) {
                    await handleUnmuteCallback(callbackQuery, token, env, botKeyValue);
                } else if (data === 'show_vpn_guide_menu') {
                    await handleShowVpnGuideMenu(callbackQuery, token, env, botKeyValue);
                } else if (data.startsWith('show_vpn_guide_')) {
                    await handleShowSpecificVpnGuide(callbackQuery, token, env, botKeyValue);
                } else {
                    console.log(`[onRequest] Unhandled callback data: ${data}`);
                    await answerCallbackQuery(token, callbackQuery.id, "မသိသော ရွေးချယ်မှု ဖြစ်ပါသည်။", true);
                }
            }
            else if (update.my_chat_member) {
                const chat = update.my_chat_member.chat;
                const newChatMember = update.my_chat_member.new_chat_member;
                const botInfo = await getBotInfo(token, botKeyValue);

                if (newChatMember.status === 'member' && newChatMember.user.is_bot && newChatMember.user.id === botInfo.id) {
                    if (chat.type === 'group' || chat.type === 'supergroup') {
                        const welcomeMessage = await getWelcomeMessage(env) || "မင်္ဂလာပါ! ကြိုဆိုပါတယ်။ ဝန်ဆောင်မှုများကို ရယူရန် /start သို့မဟုတ် /menu ကို နှိပ်ပါ။";
                        await sendMessage(token, chat.id, welcomeMessage, 'HTML', null, botKeyValue);
                    }
                } else if (newChatMember.status === 'kicked' || newChatMember.status === 'left') {
                    console.log(`[onRequest] Bot was removed from chat: ${chat.title || chat.id}`);
                }
            } else {
                console.log("[onRequest] Unhandled update type:", JSON.stringify(update, null, 2));
            }

            return new Response("OK", {
                status: 200
            });
        } catch (error) {
            console.error("[onRequest] Error handling Telegram webhook:", error.stack || error.message);
            return new Response(`Error: ${error.message}`, {
                status: 500
            });
        }
    } else {
        console.log(`[onRequest] Non-POST/non-webhook-registration request received: ${request.method} ${url.pathname}`);
        return new Response("This is a Telegram bot webhook endpoint. Please send POST requests or access /registerWebhook or /unregisterWebhook.", {
            status: 200
        });
    }
}
