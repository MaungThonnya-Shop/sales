// functions/managementHandlers.js
// Admin စီမံခန့်ခွဲမှုဆိုင်ရာ functions များကို ဤနေရာတွင် စုစည်းထားသည်

import {
    sendMessage,
    sendDocument,
    sendPhoto
} from './telegramHelpers.js';
import {
    OWNER_ADMIN_IDS,
    DEFAULT_WELCOME_MESSAGE,
    DEFAULT_WELCOME_PHOTO_FILE_ID
} from './constants.js';
import {
    storeVpnKey,
    deleteVpnKey,
    listKeys,
    storeUserTrialStatus,
    setProductPrice, // Updated import
    deleteProductPrice,
    listProducts,
    getVpnKey,
    storeWelcomeMessage,
    storeWelcomePhoto,
    deleteWelcomeMessage,
    deleteWelcomePhoto,
    storeVpnOperatorButton, // NEW: Import storeVpnOperatorButton
    getVpnOperatorButton, // NEW: Import getVpnOperatorButton
    deleteVpnOperatorButton, // NEW: Import deleteVpnOperatorButton
    listVpnOperatorButtons // NEW: Import listVpnOperatorButtons
} from './dataStorage.js';
import {
    toThaiDateTime // Helper function for date formatting ကို adminHandlers ကနေ မှန်ကန်စွာ import လုပ်ပါမည်။
} from './adminHandlers.js';

// Helper function to split long messages into chunks
function splitMessage(text, chunkSize = 4000) {
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        // If adding the next line makes the current chunk too long, push the current chunk and start a new one
        if ((currentChunk + line).length > chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
        } else {
            currentChunk += line + '\n';
        }
    }
    // Add the last chunk if it's not empty
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

/**
 * Handles the /addvpn command to store a new VPN key.
 * Command format: /addvpn <operator_code> <key_type> <key_content>
 * MODIFIED: Added operatorCode parameter.
 */
export async function handleAddVpnCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length < 3) { // MODIFIED: Now expects at least 3 arguments (operator_code, key_type, key_content)
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/addvpn <operator_code> <key_type> <key_content>`", 'Markdown', null, botKeyValue);
        return;
    }

    const operatorCode = args[0].toUpperCase(); // Convert to uppercase for consistency
    const keyType = args[1];
    const keyContent = args.slice(2).join(' '); // MODIFIED: keyContent starts from the 3rd argument

    // MODIFIED: Pass operatorCode to storeVpnKey
    const uniqueId = await storeVpnKey(env, operatorCode, keyType, keyContent);

    if (uniqueId) {
        await sendMessage(token, chatId, `✅ <b>${operatorCode}</b> အတွက် <b>${keyType}</b> VPN Key ကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။\n\nKey ID: <code>${uniqueId}</code>\nOperator: <b>${operatorCode}</b>\nအမျိုးအစား: <b>${keyType}</b>\nအကြောင်းအရာ: ${keyContent}`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, "❌ VPN Key ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။", 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /deletevpn command to delete a VPN key.
 * Command format: /deletevpn <key_id>
 * (No change needed here as deleteVpnKey in dataStorage.js now searches all prefixes)
 */
export async function handleDeleteVpnCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/deletevpn <key_id>`", 'Markdown', null, botKeyValue);
        return;
    }

    const keyId = args[0];

    const success = await deleteVpnKey(env, keyId);

    if (success) {
        await sendMessage(token, chatId, `✅ VPN Key ID: \`${keyId}\` ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'Markdown', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ VPN Key ID: \`${keyId}\` ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'Markdown', null, botKeyValue);
    }
}

/**
 * Handles the /listvpns command to list all stored VPN keys.
 * MODIFIED: List keys grouped by operator and then by key type.
 */
export async function handleListVpnsCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    await sendMessage(token, chatId, "🔄 VPN Key စာရင်းကို ပြင်ဆင်နေပါသည်။ ကျေးဇူးပြု၍ ခဏစောင့်ဆိုင်းပါ။", 'HTML', null, botKeyValue);


    const allKeys = await listKeys(env, 'SALES_DATA', 'vpn_key:');
    let text = "🔑 <b>လက်ရှိ VPN Keys များ:</b>\n\n";

    if (allKeys.length === 0) {
        text += "လက်ရှိ VPN Key မရှိသေးပါ။";
    } else {
        // Group keys by operator and then by type
        const keysByOperator = {};
        for (const fullKey of allKeys) {
            const vpnKeyData = await getVpnKey(env, fullKey);
            if (vpnKeyData) {
                const parts = fullKey.split(':');
                // New key format: vpn_key:<operator_code>:<key_type>:<unique_id>
                const operatorCode = parts[1];
                const keyType = parts[2];
                const keyId = parts[3];

                if (!keysByOperator[operatorCode]) {
                    keysByOperator[operatorCode] = {};
                }
                if (!keysByOperator[operatorCode][keyType]) {
                    keysByOperator[operatorCode][keyType] = [];
                }
                keysByOperator[operatorCode][keyType].push({
                    keyId: keyId,
                    status: vpnKeyData.status,
                    assigned_to: vpnKeyData.assigned_to,
                    expiration_time: vpnKeyData.expiration_time
                });
            }
        }

        // Sort operators alphabetically
        const sortedOperators = Object.keys(keysByOperator).sort();

        for (const operatorCode of sortedOperators) {
            // Fetch operator display name
            const operatorButton = await getVpnOperatorButton(env, operatorCode);
            const operatorDisplayName = operatorButton ? operatorButton.name : operatorCode;
            text += `🌐 <b>${operatorDisplayName} (${operatorCode}):</b>\n`;

            const keyTypesInOperator = Object.keys(keysByOperator[operatorCode]).sort();
            for (const keyType of keyTypesInOperator) {
                text += `  ➡️ <b>${keyType.replace(/_/g, ' ')}:</b>\n`;
                const keysInType = keysByOperator[operatorCode][keyType];
                keysInType.sort((a, b) => {
                    if (a.status === 'available' && b.status !== 'available') return -1;
                    if (a.status !== 'available' && b.status === 'available') return 1;
                    return 0;
                });

                for (const keyData of keysInType) {
                    text += `    - ID: <code>${keyData.keyId}</code>\n`;
                    text += `      Status: ${keyData.status}\n`;
                    if (keyData.assigned_to) {
                        text += `      Assigned to: <code>${keyData.assigned_to}</code>\n`;
                        if (keyData.expiration_time) {
                            const expiry = new Date(keyData.expiration_time * 1000).toISOString();
                            text += `    Expires on: ${toThaiDateTime(expiry)}\n`;
                        }
                    }
                }
                text += "\n";
            }
            text += "---------------------------------------\n";
        }
    }

    // Split the message into chunks if it's too long
    const messageChunks = splitMessage(text);

    // Send each chunk as a separate message
    for (let i = 0; i < messageChunks.length; i++) {
        await sendMessage(token, chatId, messageChunks[i], 'HTML', null, botKeyValue);
        // Add a small delay between messages if there are many chunks to prevent rate limiting
        if (messageChunks.length > 1 && i < messageChunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
    }

    // Optional: If the original message was too long and sent as multiple parts, you might want to confirm
    if (messageChunks.length > 1) {
        await sendMessage(token, chatId, "✅ VPN Key စာရင်းကို အပိုင်းများခွဲ၍ ပို့ပေးလိုက်ပါပြီ။", 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /reset_trial command to reset a user's trial status.
 * Command format: /resettrial <user_id>
 */
export async function handleResetTrialCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/resettrial <user_id>`", 'Markdown', null, botKeyValue);
        return;
    }

    const targetUserId = args[0];

    const success = await storeUserTrialStatus(env, targetUserId, false, null, null);

    if (success) {
        await sendMessage(token, chatId, `✅ User ID: \`${targetUserId}\` အတွက် အစမ်းသုံး Key အခြေအနေကို ပြန်လည်သတ်မှတ်ပြီးပါပြီ။`, 'Markdown', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ User ID: \`${targetUserId}\` အတွက် အစမ်းသုံး Key အခြေအနေကို ပြန်လည်သတ်မှတ်၍မရပါ။`, 'Markdown', null, botKeyValue);
    }
}


// --- New Admin Commands for Price Management ---

/**
 * Handles the /setprice command to store or update a product's price.
 * MODIFIED: Now accepts operator_code as a separate argument for VPN products.
 * Command format (MLBB/PUBG): /setprice <type> <product_id> "<product_name>" "<price>" ["<file_id>"] ["<description>"]
 * Command format (VPN): /setprice vpn <operator_code> <key_type> "<product_name>" "<price>" ["<file_id>"] ["<description>"]
 * Example (MLBB/PUBG): /setprice mlbb 86_diamonds "86 Diamonds" "2,000 MMK" "AgACAgUAA..." "Mobile Legends 86 Diamonds"
 * Example (VPN): /setprice vpn DTAC DNS_30DAY "DTAC DNS 30 DAY" "50 Baht" "AgACAgUAA..." "DTAC Network အတွက် 30 ရက် အသုံးပြုနိုင်သော DNS VPN Key ဖြစ်ပါသည်။"
 */
export async function handleSetPriceCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    // Split the message text by spaces to get initial arguments
    const fullArgs = text.split(/\s+/);
    const productType = fullArgs[1] ? fullArgs[1].toLowerCase() : null; // Get product type, handle if undefined

    // Find the start index of the first quoted string
    const firstQuoteIndex = text.indexOf('"');
    if (firstQuoteIndex === -1) {
        // No quoted strings found, invalid format
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။ Product Name နှင့် Price ကို quotes (\" \") အတွင်း ထည့်သွင်းပါ။", 'HTML', null, botKeyValue);
        return;
    }

    // Extract quoted strings using regex from the part of the string starting from the first quote
    const quotedMatches = text.substring(firstQuoteIndex).match(/"([^"]*)"/g);
    if (!quotedMatches || quotedMatches.length < 2) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။ Product Name သို့မဟုတ် Price ကို quotes (\" \") အတွင်း ထည့်သွင်းပါ။", 'HTML', null, botKeyValue);
        return;
    }

    let productId;
    let productName = quotedMatches[0].slice(1, -1); // Remove quotes
    let price = quotedMatches[1].slice(1, -1); // Remove quotes
    let fileId = quotedMatches[2] ? quotedMatches[2].slice(1, -1) : null;
    let description = quotedMatches[3] ? quotedMatches[3].slice(1, -1) : null;

    if (productType === 'vpn') {
        if (fullArgs.length < 4) { // Expects: /setprice vpn <operator_code> <key_type> "name" "price" ...
            await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ (VPN): `/setprice vpn <operator_code> <key_type> \"<product_name>\" \"<price>\" [\"<file_id>\"] [\"<description>\"]`", 'Markdown', null, botKeyValue);
            return;
        }
        const operatorCode = fullArgs[2].toUpperCase(); // This is the <operator_code>
        const keyType = fullArgs[3]; // This is the <key_type>
        productId = `${operatorCode}_${keyType}`; // Combine to form the actual productId for KV
    } else { // mlbb or pubg
        if (fullArgs.length < 3) { // Expects: /setprice <type> <product_id> "name" "price" ...
            await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ (MLBB/PUBG): `/setprice <type> <product_id> \"<product_name>\" \"<price>\" [\"<file_id>\"] [\"<description>\"]`", 'Markdown', null, botKeyValue);
            return;
        }
        productId = fullArgs[2]; // This is the actual <product_id>
    }

    // Validate essential fields (productName and price)
    if (!productName || !price) {
        await sendMessage(token, chatId,
            "❌ ဈေးနှုန်းသတ်မှတ်ရန် လိုအပ်သော အချက်အလက်များ မပြည့်စုံပါ။ (Product Name သို့မဟုတ် Price မပါဝင်ပါ)",
            'HTML', null, botKeyValue
        );
        return;
    }

    const success = await setProductPrice(env, productType, productId, productName, price, fileId, description);

    if (success) {
        let responseText = `✅ <b>${productName}</b> (${productType}) အတွက် ဈေးနှုန်း <b>${price}</b> ကို အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ။`;
        if (fileId) {
            responseText += `\nပုံ File ID: <code>${fileId}</code>`;
        }
        if (description) {
            responseText += `\nဖော်ပြချက်: ${description}`;
        }
        await sendMessage(token, chatId, responseText, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, "❌ ဈေးနှုန်းသတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။", 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /deleteprice command to delete a product's price.
 * MODIFIED: For VPN type, now accepts <operator_code> and <key_type> separately.
 * Command format (MLBB/PUBG): /deleteprice <type> <product_id>
 * Command format (VPN): /deleteprice vpn <operator_code> <key_type>
 */
export async function handleDeletePriceCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    // FIX: Added check for args.length before accessing args[0]
    if (args.length === 0) { // If no arguments are provided
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ (MLBB/PUBG): `/deleteprice <type> <product_id>`\nအသုံးပြုပုံ (VPN): `/deleteprice vpn <operator_code> <key_type>`", 'Markdown', null, botKeyValue);
        return;
    }

    let productType = args[0].toLowerCase();
    let productIdToDelete; // This will be the combined ID for KV deletion

    if (productType === 'vpn') {
        if (args.length !== 3) { // Expects: vpn, operator_code, key_type
            await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ (VPN): `/deleteprice vpn <operator_code> <key_type>`", 'Markdown', null, botKeyValue);
            return;
        }
        const operatorCode = args[1].toUpperCase();
        const keyType = args[2];
        productIdToDelete = `${operatorCode}_${keyType}`; // Combine to match KV key format
    } else {
        if (args.length !== 2) { // Expects: type, product_id
            await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ (MLBB/PUBG): `/deleteprice <type> <product_id>`", 'Markdown', null, botKeyValue);
            return;
        }
        productIdToDelete = args[1]; // Direct product_id for other types
    }

    const success = await deleteProductPrice(env, productType, productIdToDelete);

    if (success) {
        await sendMessage(token, chatId, `✅ <b>${productType}</b> မှ <b>${productIdToDelete}</b> ဈေးနှုန်းကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ <b>${productType}</b> မှ <b>${productIdToDelete}</b> ဈေးနှုန်းကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /listprices command to list all prices for a product type.
 * Command format: /listprices <type>
 * MODIFIED: For VPN type, productId displayed will be <operator_code>_<key_type>.
 */
export async function handleListPricesCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/listprices <type>`", 'Markdown', null, botKeyValue);
        return;
    }

    const productType = args[0];

    const products = await listProducts(env, productType);
    let text = `📦 <b>${productType.toUpperCase()} Prices:</b>\n\n`;

    if (products.length === 0) {
        text += "ဈေးနှုန်းများ မရှိသေးပါ။";
    } else {
        for (const product of products) {
            let displayId = product.name.replace(/\s|\+/g, '_').toLowerCase(); // Default display ID
            let kvProductId = product.productId || displayId; // Use actual productId from KV if available, else default

            // If it's a VPN product, format the ID for display
            if (productType.toLowerCase() === 'vpn' && kvProductId.includes('_')) {
                const parts = kvProductId.split('_');
                const operatorCode = parts[0].toUpperCase();
                const keyType = parts.slice(1).join('_');
                displayId = `Operator: ${operatorCode}, Type: ${keyType}`;
            } else {
                displayId = kvProductId; // For non-VPN, use the original productId
            }
            
            text += `📦 <b>${product.name}</b>\n`;
            text += `  - ID: <code>${displayId}</code>\n`; // Display the product ID as stored or formatted
            text += `  - Price: <code>${product.price}</code>\n`;
            if (product.file_id) {
                text += `  - File ID: <code>${product.file_id}</code>\n`;
            }
            if (product.description) {
                text += `  - Description: ${product.description}\n`;
            }
            text += "---------------------------------------\n";
        }
    }

    await sendMessage(token, chatId, text, 'HTML', null, botKeyValue);
}


// --- New Admin Commands for Welcome Message & Photo Management ---

/**
 * Handles the /setwelcomemessage command to set the bot's welcome message.
 * Command format: /setwelcomemessage <message_text> (can be multi-line)
 * If no text is provided, it will reset to the default message.
 */
export async function handleSetWelcomeMessageCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);
    const newWelcomeMessage = args.join(' ').trim();

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (newWelcomeMessage) {
        const success = await storeWelcomeMessage(env, newWelcomeMessage);
        if (success) {
            await sendMessage(token, chatId, `✅ Welcome Message ကို အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ။`, 'HTML', null, botKeyValue);
        } else {
            await sendMessage(token, chatId, `❌ Welcome Message သတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
        }
    } else {
        // If no text provided, reset to default
        const success = await storeWelcomeMessage(env, DEFAULT_WELCOME_MESSAGE);
        if (success) {
            await sendMessage(token, chatId, `✅ Welcome Message ကို Default Message သို့ ပြန်လည်သတ်မှတ်ပြီးပါပြီ။`, 'HTML', null, botKeyValue);
        } else {
            await sendMessage(token, chatId, `❌ Welcome Message ကို Default သို့ ပြန်လည်သတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
        }
    }
}

/**
 * Handles the /deletewelcomemessage command to delete the custom welcome message.
 * This will make the bot use the hardcoded default message.
 */
export async function handleDeleteWelcomeMessageCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const success = await deleteWelcomeMessage(env);
    if (success) {
        await sendMessage(token, chatId, `✅ Custom Welcome Message ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။ Bot သည် Default Message ကို အသုံးပြုပါမည်။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Custom Welcome Message ဖျက်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။ (သို့) မူလကတည်းက မရှိပါ။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /setwelcomephoto command to set the bot's welcome photo.
 * Command format: /setwelcomephoto (reply to a photo)
 * If no reply to photo, it will reset to the default photo.
 */
export async function handleSetWelcomePhotoCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const repliedMessage = message.reply_to_message;
    if (repliedMessage && repliedMessage.photo && repliedMessage.photo.length > 0) {
        const fileId = repliedMessage.photo[repliedMessage.photo.length - 1].file_id;
        const success = await storeWelcomePhoto(env, fileId);
        if (success) {
            await sendMessage(token, chatId, `✅ Welcome Photo ကို အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ။`, 'HTML', null, botKeyValue);
        } else {
            await sendMessage(token, chatId, `❌ Welcome Photo သတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
        }
    } else {
        // If no photo replied, reset to default
        const success = await storeWelcomePhoto(env, DEFAULT_WELCOME_PHOTO_FILE_ID);
        if (success) {
            await sendMessage(token, chatId, `✅ Welcome Photo ကို Default Photo သို့ ပြန်လည်သတ်မှတ်ပြီးပါပြီ။`, 'HTML', null, botKeyValue);
        } else {
            await sendMessage(token, chatId, `❌ Welcome Photo ကို Default သို့ ပြန်လည်သတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
        }
    }
}

/**
 * Handles the /deletewelcomephoto command to delete the custom welcome photo.
 * This will make the bot use the hardcoded default photo.
 */
export async function handleDeleteWelcomePhotoCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const success = await deleteWelcomePhoto(env);
    if (success) {
        await sendMessage(token, chatId, `✅ Custom Welcome Photo ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။ Bot သည် Default Photo ကို အသုံးပြုပါမည်။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Custom Welcome Photo ဖျက်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။ (သို့) မူလကတည်းက မရှိပါ။`, 'HTML', null, botKeyValue);
    }
}

// --- NEW: Admin Commands for VPN Operator Button Management ---

/**
 * Handles the /setoperatorbutton command to add or update a VPN operator button.
 * Command format: /setoperatorbutton <operator_code> "<operator_name>"
 * Example: /setoperatorbutton DTAC "DTAC"
 * Example: /setoperatorbutton TRUE "True Move H"
 */
export async function handleSetOperatorButtonCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const regex = /\/setoperatorbutton\s+(\S+)\s+"([^"]+)"/;
    const match = text.match(regex);

    if (!match) {
        await sendMessage(token, chatId,
            "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\n" +
            "အသုံးပြုပုံ: `/setoperatorbutton <operator_code> \"<operator_name>\"`\n" +
            "ဥပမာ: `/setoperatorbutton DTAC \"DTAC\"`",
            'Markdown', null, botKeyValue
        );
        return;
    }

    const operatorCode = match[1].toUpperCase(); // Ensure uppercase for consistency
    const operatorName = match[2];

    const success = await storeVpnOperatorButton(env, operatorCode, operatorName);

    if (success) {
        await sendMessage(token, chatId, `✅ Operator Button <b>${operatorName} (${operatorCode})</b> ကို အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Operator Button သတ်မှတ်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /deleteoperatorbutton command to delete a VPN operator button.
 * Command format: /deleteoperatorbutton <operator_code>
 * Example: /deleteoperatorbutton DTAC
 */
export async function handleDeleteOperatorButtonCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length !== 1) {
        await sendMessage(token, chatId, "❌ မှားယွင်းသော command ဖြစ်ပါသည်။\nအသုံးပြုပုံ: `/deleteoperatorbutton <operator_code>`", 'Markdown', null, botKeyValue);
        return;
    }

    const operatorCode = args[0].toUpperCase();

    const success = await deleteVpnOperatorButton(env, operatorCode);

    if (success) {
        await sendMessage(token, chatId, `✅ Operator Button <b>${operatorCode}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, `❌ Operator Button <b>${operatorCode}</b> ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`, 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /listoperatorbuttons command to list all configured VPN operator buttons.
 * Command format: /listoperatorbuttons
 */
export async function handleListOperatorButtonsCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    const operatorButtons = await listVpnOperatorButtons(env);
    let text = `📡 <b>VPN Operator Buttons:</b>\n\n`;

    if (operatorButtons.length === 0) {
        text += "Operator Button များ မရှိသေးပါ။";
    } else {
        for (const button of operatorButtons) {
            text += `  - <b>${button.name}</b> (Code: <code>${button.code}</code>)\n`;
        }
    }

    await sendMessage(token, chatId, text, 'HTML', null, botKeyValue);
}
