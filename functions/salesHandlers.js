// functions/salesHandlers.js

import {
    sendMessage,
    editMessageText,
    answerCallbackQuery,
    sendPhoto,
    getMe,
    deleteMessage // Import deleteMessage for deleting the original product message
} from './telegramHelpers.js';
import {
    MAIN_MENU_TEXT,
    MAIN_MENU_BUTTONS,
    VPN_MENU_TEXT,
    VPN_MENU_BUTTONS, // MODIFIED: This is now just a placeholder for the main VPN menu text
    MLBB_MENU_TEXT,
    PUBG_MENU_TEXT,
    MONEY_TRANSFER_TEXT,
    MONEY_TRANSFER_BUTTONS,
    SUPPORT_MENU_TEXT,
    SUPPORT_MENU_BUTTONS,
    TRIAL_VPN_DURATION_HOURS, // These will no longer be used for automatic key issuance.
    TRIAL_VPN_COOLDOWN_DAYS, // These will no longer be used for automatic key issuance.
    BACK_TO_MAIN_MENU_BUTTON,
    HOME_TO_OPERATOR_MENU_BUTTON, // NEW: Import HOME_TO_OPERATOR_MENU_BUTTON
    VPN_KEY_TYPES_MENU_TEXT, // MODIFIED: Now a function that accepts operator name
    VPN_FINAL_KEY_MENU_TEXT,
    VPN_FINAL_KEY_BUTTONS,
    ADMIN_USERNAME,
    DEFAULT_WELCOME_MESSAGE,
    DEFAULT_WELCOME_PHOTO_FILE_ID,
    NO_IMAGE_PLACEHOLDER_FILE_ID, // Add NO_IMAGE_PLACEHOLDER_FILE_ID
    VPN_OPERATOR_MENU_TEXT, // NEW: Import VPN_OPERATOR_MENU_TEXT
    VPN_GUIDE_MENU_TEXT // Corrected import: This should be imported from constants.js
} from './constants.js'; // Corrected import path for VPN_GUIDE_MENU_TEXT
import {
    getVpnKey,
    updateVpnKeyStatus,
    storeUserTrialStatus, // Will still be used for cooldown checks if needed elsewhere, but not in this specific flow.
    getUserTrialStatus, // Will still be used for cooldown checks if needed elsewhere, but not in this specific flow.
    listProducts, // Import listProducts
    listKeys,
    getWelcomeMessage,
    getWelcomePhoto,
    listVpnOperatorButtons, // NEW: Import listVpnOperatorButtons
    getVpnOperatorButton // NEW: Import getVpnOperatorButton
} from './dataStorage.js';
import {
    handlePaymentInitiation,
    findAvailableVpnKeyByType // adminHandlers.js ကနေ လိုအပ်တာမို့ ဒီနေရာမှာ export လုပ်ထားပါတယ်။
} from './paymentHandlers.js'; // paymentHandlers.js ဖိုင်အသစ်မှ import လုပ်ထားသည်
import {
    handleShowVpnGuideMenu // NEW: Import handleShowVpnGuideMenu from vpnGuideHandlers.js
} from './vpnGuideHandlers.js'; // Ensure this path is correct if vpnGuideHandlers is in the same directory


/**
 * Helper function to count available VPN keys for a given type and operator.
 * MODIFIED: Added operatorCode parameter to filter keys.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The operator code to filter by.
 * @param {string} keyType - The type of VPN key to count.
 * @returns {Promise<number>} - The count of available keys.
 */
async function countAvailableKeysByType(env, operatorCode, keyType) {
    // MODIFIED: Prefix now includes operatorCode
    const allKeys = await listKeys(env, 'SALES_DATA', `vpn_key:${operatorCode}:${keyType}:`);
    let count = 0;
    for (const fullKey of allKeys) {
        const vpnKeyData = await getVpnKey(env, fullKey);
        if (vpnKeyData && vpnKeyData.status === 'available') {
            count++;
        }
    }
    return count;
}


// Function to handle /start and /menu commands
export async function handleStartAndMenuCommand(token, chatId, messageId, botKeyValue, isCallbackQuery = false, env) {
    const replyMarkup = {
        inline_keyboard: MAIN_MENU_BUTTONS
    };

    // Get custom welcome message and photo from KV, or use defaults
    const customWelcomeMessage = await getWelcomeMessage(env);
    const customWelcomePhotoFileId = await getWelcomePhoto(env);

    const finalWelcomeMessage = customWelcomeMessage || DEFAULT_WELCOME_MESSAGE;
    const finalWelcomePhotoFileId = customWelcomePhotoFileId || DEFAULT_WELCOME_PHOTO_FILE_ID;

    if (isCallbackQuery) {
        // If it's a callback query, just edit the message to show the main menu.
        // We don't re-send the welcome photo on every menu callback to avoid complexity.
        // Ensure parse_mode is HTML for proper formatting
        // FIX: If the message has a photo, we need to delete it and send a new text message.
        // Check if the original message has a photo
        if (callbackQuery.message.photo) {
            try {
                await deleteMessage(token, chatId, messageId, botKeyValue);
                console.log(`[handleStartAndMenuCommand] Successfully deleted original photo message ${messageId}.`);
            } catch (e) {
                console.error(`[handleStartAndMenuCommand] Failed to delete original photo message ${messageId}: ${e.message}`);
            }
            // Send a new text message
            await sendMessage(token, chatId, MAIN_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
        } else {
            // If no photo, just edit the text message
            await editMessageText(token, chatId, messageId, MAIN_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
        }
    } else {
        // For initial /start or /menu command (not a callback)
        if (finalWelcomePhotoFileId) {
            // Send photo with welcome message as caption
            // Ensure parse_mode is HTML for proper formatting in caption
            await sendPhoto(token, chatId, finalWelcomePhotoFileId, finalWelcomeMessage, null, botKeyValue);
            // Then send a separate message with the main menu buttons
            // Ensure parse_mode is HTML for proper formatting
            await sendMessage(token, chatId, MAIN_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
        } else {
            // If no photo, just send the welcome message text with main menu buttons
            // Ensure parse_mode is HTML for proper formatting
            await sendMessage(token, chatId, finalWelcomeMessage, 'HTML', replyMarkup, botKeyValue);
        }
    }
}

// Function to handle callback queries for main menus
export async function handleMainMenuCallback(callbackQuery, token, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id; // Corrected to .message_id
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    await answerCallbackQuery(token, callbackQuery.id); // Dismiss loading on button

    let text = '';
    let replyMarkup = {};

    switch (data) {
        case 'main_menu':
            text = MAIN_MENU_TEXT;
            replyMarkup = {
                inline_keyboard: MAIN_MENU_BUTTONS
            };
            break;
        case 'menu_vpn':
            // MODIFIED: This case now directly calls handleVpnBuyRequest to show the operator selection menu.
            // This ensures that when "VPN Services" is clicked, or "↩️ နောက်သို့" from operator list is clicked,
            // it always leads to the operator selection menu.
            await handleVpnBuyRequest(callbackQuery, token, callbackQuery.env, botKeyValue);
            return; // Exit here as handleVpnBuyRequest will send/edit the message
        case 'menu_mlbb':
            // Fetch latest MLBB prices from KV
            const mlbbProducts = await listProducts(callbackQuery.env, 'mlbb');
            let mlbbButtons = [];
            if (mlbbProducts.length > 0) {
                mlbbButtons = mlbbProducts.map(pkg => {
                    // Use pkg.name if available, otherwise fallback to pkg.item_name
                    const itemName = pkg.name || pkg.item_name;
                    // Ensure itemName is not undefined before calling replace
                    const callbackProductId = itemName ? itemName.replace(/\s|\+/g, '_').toLowerCase() : '';
                    return [{
                        text: `${itemName} (${pkg.price})`,
                        callback_data: `mlbb_buy_${callbackProductId}`
                    }];
                });
            } else {
                mlbbButtons.push([{ text: "No MLBB products available. Please contact admin.", callback_data: "menu_support" }]);
            }
            mlbbButtons.push([BACK_TO_MAIN_MENU_BUTTON]);

            text = MLBB_MENU_TEXT;
            replyMarkup = {
                inline_keyboard: mlbbButtons
            };
            break;
        case 'menu_pubg':
            // Fetch latest PUBG prices from KV
            const pubgProducts = await listProducts(callbackQuery.env, 'pubg');
            let pubgButtons = [];
            if (pubgProducts.length > 0) {
                pubgButtons = pubgProducts.map(pkg => {
                    // Use pkg.name if available, otherwise fallback to pkg.item_name
                    const itemName = pkg.name || pkg.item_name;
                    // Ensure itemName is not undefined before calling replace
                    const callbackProductId = itemName ? itemName.replace(/\s|\+/g, '_').toLowerCase() : '';
                    return [{
                        text: `${itemName} (${pkg.price})`,
                        callback_data: `pubg_buy_${callbackProductId}`
                    }];
                });
            } else {
                pubgButtons.push([{ text: "No PUBG products available. Please contact admin.", callback_data: "menu_support" }]);
            }
            pubgButtons.push([BACK_TO_MAIN_MENU_BUTTON]);

            text = PUBG_MENU_TEXT;
            replyMarkup = {
                inline_keyboard: pubgButtons
            };
            break;
        case 'menu_money_transfer':
            text = MONEY_TRANSFER_TEXT;
            replyMarkup = {
                inline_keyboard: MONEY_TRANSFER_BUTTONS
            };
            break;
        case 'menu_support':
            text = SUPPORT_MENU_TEXT;
            replyMarkup = {
                inline_keyboard: SUPPORT_MENU_BUTTONS
            };
            break;
        case 'menu_vpn_services': // NEW: Add this case to handle the callback from vpnGuideHandlers.js
            await handleShowVpnGuideMenu(callbackQuery, token, callbackQuery.env, botKeyValue); // Call the VPN guide menu handler
            return; // Exit as handleShowVpnGuideMenu will handle the message
        default:
            console.log(`[handleMainMenuCallback] Unhandled callback data: ${data}`);
            return;
    }

    // FIX: If the message has a photo, we need to delete it and send a new text message.
    // Otherwise, we can just edit the text message.
    if (callbackQuery.message.photo) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            console.log(`[handleMainMenuCallback] Successfully deleted original photo message ${messageId}.`);
        } catch (e) {
            console.error(`[handleMainMenuCallback] Failed to delete original photo message ${messageId}: ${e.message}`);
        }
        // Send a new text message
        await sendMessage(token, chatId, text, 'HTML', replyMarkup, botKeyValue);
    } else {
        // If no photo, just edit the text message
        await editMessageText(token, chatId, messageId, text, 'HTML', replyMarkup, botKeyValue);
    }
}


// Handle VPN buy request - show dynamic VPN Operator buttons
// MODIFIED: This function now displays operator buttons instead of key types.
export async function handleVpnBuyRequest(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    await answerCallbackQuery(token, callbackQuery.id, "VPN Operator များကို ပြသပါမည်။", true);

    // Fetch all configured VPN operator buttons
    const operatorButtons = await listVpnOperatorButtons(env);
    let dynamicButtons = [];

    if (operatorButtons.length > 0) {
        // Create buttons for each operator
        for (const operator of operatorButtons) {
            dynamicButtons.push([{
                text: operator.name,
                callback_data: `vpn_operator_select_${operator.code}` // New callback data format
            }]);
        }
    } else {
        dynamicButtons.push([{
            text: "No VPN Operators configured. Please contact admin.",
            callback_data: "menu_support"
        }]);
    }

    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const replyMarkup = {
        inline_keyboard: dynamicButtons.concat([
            [BACK_TO_MAIN_MENU_BUTTON] // Back to main menu
        ])
    };

    // FIX: If the message has a photo, delete it first before sending a new text message.
    if (callbackQuery.message.photo) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            console.log(`[handleVpnBuyRequest] Successfully deleted original photo message ${messageId}.`);
        } catch (e) {
            console.error(`[handleVpnBuyRequest] Failed to delete original photo message ${messageId}: ${e.message}`);
        }
        await sendMessage(token, chatId, VPN_OPERATOR_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    } else {
        await editMessageText(token, chatId, messageId, VPN_OPERATOR_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    }
}

// NEW FUNCTION: Handle selection of a specific VPN operator
export async function handleVpnOperatorSelection(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data; // e.g., 'vpn_operator_select_DTAC'

    const operatorCode = data.substring('vpn_operator_select_'.length); // Extract the operator code

    // Fetch operator display name
    const operatorButton = await getVpnOperatorButton(env, operatorCode);
    const operatorDisplayName = operatorButton ? operatorButton.name : operatorCode;

    await answerCallbackQuery(token, callbackQuery.id, `"${operatorDisplayName}" အတွက် VPN Plan များကို ပြသပါမည်။`, true);

    // Fetch all unique VPN key types that have keys added for this operator
    // MODIFIED: Prefix now includes operatorCode
    const allKeysForOperator = await listKeys(env, 'SALES_DATA', `vpn_key:${operatorCode}:`);
    const uniqueKeyTypes = new Set();
    for (const fullKey of allKeysForOperator) {
        const parts = fullKey.split(':');
        // New key format: vpn_key:<operator_code>:<key_type>:<unique_id>
        if (parts.length === 4 && parts[1] === operatorCode) {
            uniqueKeyTypes.add(parts[2]); // Add the keyType (e.g., NOPRO, DNS)
        }
    }

    let dynamicButtons = [];
    if (uniqueKeyTypes.size > 0) {
        // Create buttons for each unique key type with count of available keys for this operator
        for (const keyType of Array.from(uniqueKeyTypes).sort()) {
            // MODIFIED: Pass operatorCode to countAvailableKeysByType
            const availableCount = await countAvailableKeysByType(env, operatorCode, keyType);
            
            // Fetch product details to get the price, but use keyType for button text
            // MODIFIED: Product price key format now includes operatorCode
            const productDetails = await env.SALES_DATA.get(`product_price:vpn:${operatorCode}_${keyType}`, { // Assuming product price key is product_price:vpn:OPERATOR_KEYTYPE
                type: 'json'
            });
            const priceText = productDetails && productDetails.price ? ` (${productDetails.price})` : "";
            
            // Button text should NOT include price, as per previous request.
            const buttonText = `${keyType.replace(/_/g, ' ')} (${availableCount} ခုကျန်)`;

            dynamicButtons.push([{
                text: buttonText,
                callback_data: `vpn_key_type_${operatorCode}_${keyType}` // New callback data format: vpn_key_type_OPERATOR_KEYTYPE
            }]);
        }
    } else {
        dynamicButtons.push([{
            text: "No VPN Plans available for this operator. Please contact admin.",
            callback_data: "menu_support"
        }]);
    }

    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const replyMarkup = {
        inline_keyboard: dynamicButtons.concat([
            [{
                text: "↩️ နောက်သို့",
                callback_data: `vpn_buy` // Back to operator selection menu
            }],
            [HOME_TO_OPERATOR_MENU_BUTTON] // Home button
        ])
    };

    // FIX: If the message has a photo, delete it first before sending a new text message.
    if (callbackQuery.message.photo) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            console.log(`[handleVpnOperatorSelection] Successfully deleted original photo message ${messageId}.`);
        } catch (e) {
            console.error(`[handleVpnOperatorSelection] Failed to delete original photo message ${messageId}: ${e.message}`);
        }
        // MODIFIED: Text now includes operator name
        await sendMessage(token, chatId, VPN_KEY_TYPES_MENU_TEXT(operatorDisplayName), 'HTML', replyMarkup, botKeyValue);
    } else {
        // MODIFIED: Text now includes operator name
        await editMessageText(token, chatId, messageId, VPN_KEY_TYPES_MENU_TEXT(operatorDisplayName), 'HTML', replyMarkup, botKeyValue);
    }
}


// New function to handle selection of a specific VPN key type (e.g., DNS 50 ဘတ်)
// MODIFIED: Now handles operatorCode in callback data
export async function handleVpnKeyTypeSelection(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data; // e.g., 'vpn_key_type_DTAC_DNS_50_ဘတ္'

    const parts = data.substring('vpn_key_type_'.length).split('_'); // e.g., ['DTAC', 'DNS', '50', 'ဘတ္']
    const operatorCode = parts[0];
    const keyType = parts.slice(1).join('_'); // Reconstruct keyType (e.g., 'DNS_50_ဘတ္')

    // Fetch operator display name
    const operatorButton = await getVpnOperatorButton(env, operatorCode);
    const operatorDisplayName = operatorButton ? operatorButton.name : operatorCode;

    await answerCallbackQuery(token, callbackQuery.id, `"${operatorDisplayName} - ${keyType.replace(/_/g, ' ')}" အတွက် ရွေးချယ်မှုများ ပြသပါမည်။`, true);

    // Fetch product details for the selected VPN key type to get its name, price, file_id, description
    // MODIFIED: Product price key format now includes operatorCode
    const productDetails = await callbackQuery.env.SALES_DATA.get(`product_price:vpn:${operatorCode}_${keyType}`, { // Assuming product price key is product_price:vpn:OPERATOR_KEYTYPE
        type: 'json'
    });
    let vpnPrice = productDetails ? productDetails.price : "N/A";
    let vpnName = productDetails ? (productDetails.name || productDetails.item_name) : `${operatorDisplayName} - ${keyType.replace(/_/g, ' ')}`;

    // MODIFIED: Construct the new text for the menu based on user's request
    const finalKeyMenuText = `သင်ရွေးချယ်ထားသော "<b>${vpnName}</b>" အတွက် အစမ်းသုံး ကီးကို Admin သို့ ဆက်သွယ်ပြီး <b>အစမ်းသုံးကီး</b>ရယူနိူင်ပါတယ်။...(သို့မဟုတ်) VIP ဝယ်ယူရန် ရွေးချယ်နိုင်ပါသည်။\n\n` +
                             `ဈေးနှုန်း: <b>${vpnPrice}</b>`;

    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const replyMarkup = {
        inline_keyboard: [
            [{ text: "💬Admin ဆက်သွယ်ရန်(TrialKey)", url: `https://t.me/${ADMIN_USERNAME.substring(1)}` }],
            [{ text: "💰 VIP KEY ဝယ်ယူရန်", callback_data: `vpn_select_buy_${operatorCode}_${keyType}` }], // MODIFIED: New callback data format
            [{ text: "↩️ နောက်သို့", callback_data: `vpn_operator_select_${operatorCode}` }], // MODIFIED: Back to specific operator's key types
            [HOME_TO_OPERATOR_MENU_BUTTON] // Home button
        ]
    };

    // FIX: If the message has a photo, delete it first before sending a new text message.
    if (callbackQuery.message.photo) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue);
            console.log(`[handleVpnKeyTypeSelection] Successfully deleted original photo message ${messageId}.`);
        } catch (e) {
            console.error(`[handleVpnKeyTypeSelection] Failed to delete original photo message ${messageId}: ${e.message}`);
        }
        await sendMessage(token, chatId, finalKeyMenuText, 'HTML', replyMarkup, botKeyValue);
    } else {
        await editMessageText(token, chatId, messageId, finalKeyMenuText, 'HTML', replyMarkup, botKeyValue);
    }
}

// New function to handle final VPN key selection (Trial or VIP)
// MODIFIED: Now handles operatorCode in callback data
export async function handleVpnFinalKeySelection(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data; // e.g., 'vpn_select_buy_DTAC_DNS_50_ဘတ္' or 'vpn_buy_DTAC_DTAC_GAMEPLAN' (from _middleware FIX)
    const userId = callbackQuery.from.id;

    // Determine if it's 'vpn_select_buy' or 'vpn_buy' and parse accordingly
    let itemType, operatorCode, productIdRaw;
    if (data.startsWith('vpn_select_buy_')) {
        const parts = data.substring('vpn_select_buy_'.length).split('_');
        itemType = 'vpn'; // Hardcode type as vpn for these callbacks
        operatorCode = parts[0];
        productIdRaw = parts.slice(1).join('_'); // Reconstruct keyType (e.g., 'DNS_50_ဘတ္')
    } else if (data.startsWith('vpn_buy_')) { // This is the old callback from salesHandlers, now routed here by middleware
        const parts = data.substring('vpn_buy_'.length).split('_');
        itemType = 'vpn'; // Hardcode type as vpn
        operatorCode = parts[0];
        productIdRaw = parts.slice(1).join('_'); // Reconstruct productIdRaw (e.g., 'DTAC_GAMEPLAN', 'Jaidee')
    } else {
        // Fallback or error handling for unexpected data format
        await answerCallbackQuery(token, callbackQuery.id, "မသိသောရွေးချယ်မှု ဖြစ်ပါသည်။", true);
        return;
    }


    // Fetch product details for the selected VPN key type to get its name, price, file_id, description
    // MODIFIED: Product price key format now includes operatorCode
    const productDetails = await callbackQuery.env.SALES_DATA.get(`product_price:vpn:${operatorCode}_${productIdRaw}`, {
        type: 'json'
    });

    let itemName = productDetails ? (productDetails.name || productDetails.item_name) : `${operatorCode} - ${productIdRaw.replace(/_/g, ' ')} VIP Key`;
    let itemPrice = productDetails ? productDetails.price : "N/A";
    let itemFileId = productDetails ? productDetails.file_id : null;
    let itemDescription = productDetails ? productDetails.description : null;

    await answerCallbackQuery(token, callbackQuery.id, `"${itemName}" ဝယ်ယူရန် အချက်အလက်များ ပြသပါမည်။`, true);

    // Construct the message for product details
    let productInfoText = `<b>${itemName}</b>\n\n` +
                          `ဈေးနှုန်း: <b>${itemPrice}</b>\n`;
    if (itemDescription) {
        productInfoText += `အသေးစိတ်: ${itemDescription}\n`;
    }
    productInfoText += `\nငွေပေးချေမှုမလုပ်ခင် အရင်ဆုံး Bot ရဲ့ private chat ကို START လုပ်ထားပေးပါ...ထို့နောက် ငွေပေးချေရန် ခလုတ်အား အသုံးပြုနိူင်ပါပြီ။`;

    const botInfo = await getMe(token, botKeyValue); // Get bot info for private chat URL

    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const confirmBuyButtons = {
        inline_keyboard: [
            [{
                text: "💬Bot Private Chat သွားရန်",
                url: `https://t.me/${botInfo.username}`
            }],
            [{
                text: "✅ငွေပေးချေရန် လုပ်ဆောင်မည်",
                callback_data: `confirm_initiate_payment_vpn_${operatorCode}_${productIdRaw}` // MODIFIED: New callback data format
            }],
            [{
                text: "↩️ နောက်သို့",
                // FIX: Changed backCallbackData to go back to the VPN Key Type selection page
                // This is the correct fix for the current "looping" back button issue
                callback_data: `vpn_key_type_${operatorCode}_${productIdRaw}` // Go back to the specific operator's key types
            }],
            [HOME_TO_OPERATOR_MENU_BUTTON] // Home button
        ]
    };

    // Send photo with product details as caption
    const photoToSend = itemFileId || NO_IMAGE_PLACEHOLDER_FILE_ID;
    // FIX: Delete the original message before sending the new photo message.
    try {
        await deleteMessage(token, chatId, messageId, botKeyValue);
        console.log(`[handleVpnFinalKeySelection] Successfully deleted original message ${messageId}.`);
    } catch (e) {
        console.error(`[handleVpnFinalKeySelection] Failed to delete original message ${messageId}: ${e.message}`);
    }
    await sendPhoto(token, chatId, photoToSend, productInfoText, confirmBuyButtons, botKeyValue);
}

// REMOVED: The handleVpnTrialRequest function is no longer needed as trial keys are not issued automatically.
// If it were called elsewhere, it would be commented out or its call removed.
// As confirmed, it's only called here, so it's fully removed.
/*
export async function handleVpnTrialRequest(callbackQuery, token, env, botKeyValue) {
    // ... (content of the function)
}
*/


// New handler for initiating payment after product details are shown
// This function will now display a confirmation message instead of directly initiating payment
// MODIFIED: Now handles operatorCode in callback data
export async function handleInitiatePaymentCallback(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id; // Original message ID (the photo with product details)
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data; // e.g., 'confirm_initiate_payment_vpn_DTAC_DNS_30DAY'

    const parts = data.split('_');
    const itemType = parts[3]; // 'vpn'
    const operatorCode = parts[4]; // NEW: Extract operatorCode
    const productIdRaw = parts.slice(5).join('_'); // Reconstruct productIdRaw (e.g., 'DNS_30DAY' for VPN, or '86_diamonds' for MLBB)

    // Fetch product details again to ensure we have the latest info
    // MODIFIED: Product price key format now includes operatorCode for VPN
    const productKey = (itemType === 'vpn') ? `product_price:${itemType}:${operatorCode}_${productIdRaw}` : `product_price:${itemType}:${productIdRaw}`;
    const productDetails = await env.SALES_DATA.get(productKey, {
        type: 'json'
    });

    let itemName = "Unknown Item";
    let itemPrice = "N/A"; // Initialize with N/A
    if (productDetails) {
        itemName = productDetails.name || productDetails.item_name; // Use fallback for itemName
        itemPrice = productDetails.price; // Get the price from productDetails
    }

    // Answer callback query with an alert
    await answerCallbackQuery(token, callbackQuery.id, `ငွေပေးချေမှု အချက်အလက်များကို သင့် Private Chat သို့ ပို့ပါမည်။`, true);

    const botInfo = await getMe(token, botKeyValue);

    const finalMessageText = `<b>${itemName}</b> ဝယ်ယူရန်အတွက် ငွေပေးချေမှု အချက်အလက်များကို သင့် <b>Private Chat</b> သို့ ပေးပို့ထားပါသည်။ ကျေးဇူးပြု၍ စစ်ဆေးပါ။`;
    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const finalMessageButtons = {
        inline_keyboard: [
            [{
                text: "💬Bot Private Chat သွားရန်",
                url: `https://t.me/${botInfo.username}`
            }],
            [{
                text: "↩️ နောက်သို့",
                // FIX: Changed backCallbackData to go back to the product details page
                // THIS LINE IS THE FIX FOR THE "မသိသောရွေးချယ်မှု" ERROR
                callback_data: `vpn_select_buy_${operatorCode}_${productIdRaw}` // Go back to the item's buy confirmation page
            }],
            [HOME_TO_OPERATOR_MENU_BUTTON] // Home button
        ]
    };

    // --- FIX: Delete the original photo message and send a new text message ---
    // First, try to delete the original message (the photo with product details)
    try {
        await deleteMessage(token, chatId, messageId, botKeyValue);
        console.log(`[handleInitiatePaymentCallback] Successfully deleted message ${messageId} in chat ${chatId}.`);
    } catch (e) {
        console.error(`[handleInitiatePaymentCallback] Failed to delete message ${messageId} in chat ${chatId}: ${e.message}`);
        // If deletion fails, we can't replace the message. We'll just send a new one.
        // The old photo message will remain, which is not ideal but better than breaking the flow.
    }

    // Then, send a new message with the desired text and buttons
    await sendMessage(token, chatId, finalMessageText, 'HTML', finalMessageButtons, botKeyValue);

    // Call handlePaymentInitiation in the background to send details to user's private chat
    await handlePaymentInitiation(callbackQuery, token, env, botKeyValue, {
        itemName: itemName,
        itemType: itemType,
        operatorCode: (itemType === 'vpn') ? operatorCode : null, // Pass operatorCode ONLY for VPN items
        itemId: productIdRaw, // MODIFIED: Pass the raw product ID (keyType for VPN, productId for MLBB/PUBG)
        itemPrice: itemPrice, // MODIFIED: Pass the correctly retrieved itemPrice
        itemFileId: productDetails ? productDetails.file_id : null, // Pass the product's image file ID
        itemDescription: productDetails ? productDetails.description : null,
        backCallbackData: `vpn_select_buy_${operatorCode}_${productIdRaw}`, // MODIFIED: This back callback is for the private chat message, directs to original product page
        initialMessageId: messageId, // Original message ID in group (for logging/tracking, not used by handlePaymentInitiation for editing)
        initialChatId: chatId, // Original chat ID (group chat)
        userId: userId // User's private chat ID
    });
}


// Handle MLBB / PUBG buy request - show payment details
export async function handleGameItemBuyRequest(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;
    const callbackData = callbackQuery.data; // e.g., 'mlbb_buy_86_diamonds', 'pubg_buy_60_uc'

    const parts = callbackData.split('_');
    const itemType = parts[0]; // 'mlbb' or 'pubg'
    const productIdRaw = parts.slice(2).join('_'); // e.g., '86_diamonds', '60_uc'

    await answerCallbackQuery(token, callbackQuery.id, ` ${itemType.toUpperCase()} item ဝယ်ယူရန် အချက်အလက်များ ပြသပါမည်။`, true);

    // Retrieve product details (name, price, file_id, description) from KV
    const productKey = `product_price:${itemType}:${productIdRaw}`;
    const productDetails = await callbackQuery.env.SALES_DATA.get(productKey, {
        type: 'json'
    });

    let itemName = "Unknown Item";
    let itemPrice = "N/A";
    let itemFileId = null;
    let itemDescription = null;
    let fallbackButtons = [];

    if (itemType === 'mlbb') {
        const mlbbProducts = await listProducts(env, 'mlbb');
        if (mlbbProducts.length > 0) {
            fallbackButtons = mlbbProducts.map(pkg => {
                const nameToUse = pkg.name || pkg.item_name;
                const callbackId = nameToUse ? nameToUse.replace(/\s|\+/g, '_').toLowerCase() : '';
                return [{ text: `${nameToUse} (${pkg.price})`, callback_data: `mlbb_buy_${callbackId}` }];
            });
        }
        fallbackButtons.push([BACK_TO_MAIN_MENU_BUTTON]);
    } else if (itemType === 'pubg') {
        const pubgProducts = await listProducts(env, 'pubg');
        if (pubgProducts.length > 0) {
            fallbackButtons = pubgProducts.map(pkg => {
                const nameToUse = pkg.name || pkg.item_name;
                const callbackId = nameToUse ? nameToUse.replace(/\s|\+/g, '_').toLowerCase() : '';
                return [{ text: `${nameToUse} (${pkg.price})`, callback_data: `pubg_buy_${callbackId}` }];
            });
        }
        fallbackButtons.push([BACK_TO_MAIN_MENU_BUTTON]);
    }


    if (productDetails) {
        itemName = productDetails.name || productDetails.item_name; // Use fallback for itemName
        itemPrice = productDetails.price;
        itemFileId = productDetails.file_id || NO_IMAGE_PLACEHOLDER_FILE_ID; // Use placeholder if no specific image
        itemDescription = productDetails.description;
    } else {
        // FIX: If product not found, delete the original message (if it was a photo) and send a new text message.
        if (callbackQuery.message.photo) {
            try {
                await deleteMessage(token, chatId, messageId, botKeyValue);
                console.log(`[handleGameItemBuyRequest] Successfully deleted original photo message ${messageId} due to product not found.`);
            } catch (e) {
                console.error(`[handleGameItemBuyRequest] Failed to delete original photo message ${messageId}: ${e.message}`);
            }
            await sendMessage(token, chatId, "❌ ရွေးချယ်ထားသော Item ကို ရှာမတွေ့ပါ။ နောက်မှ ထပ်မံကြိုးစားကြည့်ပါ သို့မဟုတ် Admin ကို ဆက်သွယ်ပါ။", 'HTML', {
                inline_keyboard: fallbackButtons
            }, botKeyValue);
        } else {
            await editMessageText(token, chatId, messageId, "❌ ရွေးချယ်ထားသော Item ကို ရှာမတွေ့ပါ။ နောက်မှ ထပ်မံကြိုးစားကြည့်ပါ သို့မဟုတ် Admin ကို ဆက်သွယ်ပါ။", 'HTML', {
                inline_keyboard: fallbackButtons
            }, botKeyValue);
        }
        return;
    }

    // Construct the message for product details
    let productInfoText = `<b>${itemName}</b>\n\n` +
                          `ဈေးနှုန်း: <b>${itemPrice}</b>\n`;
    if (itemDescription) {
        productInfoText += `အသေးစိတ်: ${itemDescription}\n`;
    }
    productInfoText += `\nငွေပေးချေမှုမလုပ်ခင် အရင်ဆုံး Bot ရဲ့ private chat ကို START လုပ်ထားပေးပါ...ထို့နောက် ငွေပေးချေရန် ခလုတ်အား အသုံးပြုနိူင်ပါပြီ။`;

    const botInfo = await getMe(token, botKeyValue); // Get bot info for private chat URL

    // MODIFIED: Added HOME_TO_OPERATOR_MENU_BUTTON to the reply markup
    const confirmBuyButtons = {
        inline_keyboard: [
            [{
                text: "💬Bot Private Chat သွားရန်",
                url: `https://t.me/${botInfo.username}`
            }],
        
            [{
                text: "✅ငွေပေးချေရန် လုပ်ဆောင်မည်",
                callback_data: `confirm_initiate_payment_${itemType}_${productIdRaw}` // Changed callback data
            }],
            [{
                text: "↩️ နောက်သို့",
              
                callback_data: `menu_${itemType}` // Back to MLBB/PUBG menu
            }],
            [HOME_TO_OPERATOR_MENU_BUTTON] // Home button
        ]
    };
    // Send photo with product details as caption
    const photoToSend = itemFileId || NO_IMAGE_PLACEHOLDER_FILE_ID;
    // FIX: Delete the original message before sending the new photo message.
    try {
        await deleteMessage(token, chatId, messageId, botKeyValue);
        console.log(`[handleGameItemBuyRequest] Successfully deleted original message ${messageId}.`);
    } catch (e) {
        console.error(`[handleGameItemBuyRequest] Failed to delete original message ${messageId}: ${e.message}`);
    }
    await sendPhoto(token, chatId, photoToSend, productInfoText, confirmBuyButtons, botKeyValue);
}
