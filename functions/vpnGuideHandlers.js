// functions/vpnGuideHandlers.js
// VPN အသုံးပြုနည်းလမ်းညွှန်များနှင့် သက်ဆိုင်သော functions များကို ဤနေရာတွင် စုစည်းထားသည်

import {
    sendMessage,
    sendPhoto,
    editMessageText,
    answerCallbackQuery,
    deleteMessage
} from './telegramHelpers.js';
import {
    OWNER_ADMIN_IDS,
    VPN_GUIDE_KEY_PREFIX,
    VPN_GUIDE_MENU_TEXT,
    BACK_TO_VPN_GUIDE_MENU_BUTTON
} from './constants.js';
import {
    storeData,
    retrieveData,
    deleteData,
    listKeys
} from './dataStorage.js';


// Helper function to split long messages into chunks (copied from managementHandlers.js)
function splitMessage(text, chunkSize = 4000) {
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        if ((currentChunk + line).length > chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
        } else {
            currentChunk += line + '\n';
        }
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}


// --- Admin Commands for VPN Guide Management ---

/**
 * Handles the /addvpnguide command to store a new VPN usage guide step.
 * Command format: /addvpnguide <app_code> <step_number> "<step_text>" "<image_file_id>" "<display_name>" "<download_link>"
 * Example: /addvpnguide NETMOD 1 "NetMod VPN application ကို install လုပ်ပါ။" "AgACAg..." "NetMod" "https://example.com/netmod.apk"
 */
export async function handleAddVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ ဝမ်းနည်းပါတယ် ယခု command ကို မင်းအနေနဲ့ အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    // MODIFIED: Regex to parse 6 required quoted arguments
    // 1: app_code (\S+)
    // 2: step_number (\d+)
    // 3: step_text ("([^"]+)")
    // 4: image_file_id ("([^"]+)")
    // 5: display_name ("([^"]+)") <-- NEW
    // 6: download_link ("([^"]+)")
    const regex = /\/addvpnguide\s+(\S+)\s+(\d+)\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/;
    const match = text.match(regex);

    if (!match) {
        await sendMessage(token, chatId,
            "❌ <b>အသုံးပြုပုံ မှားယွင်းနေပါသည်။</b>\n" +
            "VPN Guide ထည့်ရန်: `/addvpnguide <app_code> <step_number> \"<step_text>\" \"<image_file_id>\" \"<display_name>\" \"<download_link>\"`\n\n" +
            "ဥပမာ: `/addvpnguide NETMOD 1 \"NetMod VPN application ကို install လုပ်ပါ။\" \"AgACAg...\" \"NetMod\" \"https://example.com/netmod.apk\"`\n" +
            "<b>မှတ်ချက်:</b> ပုံမရှိပါက image_file_id အစား quotes အတွင်း (<code>-</code>) ကို ထည့်ပါ။",
            'Markdown', null, botKeyValue);
        return;
    }

    const appCode = match[1].toUpperCase();
    const stepNumber = parseInt(match[2], 10);
    const stepText = match[3];
    const imageFileId = (match[4] && match[4] !== '-') ? match[4] : null; // Check for '-' placeholder
    const displayName = match[5]; // NEW: Display Name
    const downloadLink = match[6] || null;

    if (isNaN(stepNumber) || stepNumber <= 0) {
        await sendMessage(token, chatId, "❌ Step Number မှာ နံပါတ်ဖြစ်ရမည်ဖြစ်ပြီး ၁ ထက်ကြီးရမည်။", 'HTML', null, botKeyValue);
        return;
    }

    const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
    const data = {
        app_code: appCode,
        step_number: stepNumber,
        text: stepText,
        image_file_id: imageFileId,
        display_name: displayName, // NEW: display_name ကို ထည့်သွင်း
        download_link: downloadLink,
        created_at: Date.now()
    };

    const success = await storeData(env, 'SALES_DATA', fullKey, data);

    if (success) {
        let responseText = `✅ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။\n\n`;
        responseText += `Button Name: <b>${displayName}</b>\n`; // NEW: Button Name ပြန်ပြခြင်း
        responseText += `ဖော်ပြချက်: ${stepText.substring(0, 100)}...\n`;
        if (imageFileId) {
            responseText += `ပုံ File ID: <code>${imageFileId}</code>\n`;
        }
        if (downloadLink) {
            responseText += `Download Link: ${downloadLink}\n`;
        }
        await sendMessage(token, chatId, responseText, 'HTML', null, botKeyValue);
    } else {
        await sendMessage(token, chatId, "❌ VPN Guide ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။", 'HTML', null, botKeyValue);
    }
}

/**
 * Handles the /deletevpnguide command to delete VPN usage guide steps.
 * Command format: /deletevpnguide <app_code> [step_number]
 * If step_number is not provided, deletes all steps for that app.
 */
export async function handleDeleteVpnGuideCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    if (args.length < 1 || args.length > 2) {
        await sendMessage(token, chatId,
            "❌ <b>အသုံးပြုပုံ မှားယွင်းနေပါသည်။</b>\n" +
            "VPN Guide ဖျက်ရန်: `/deletevpnguide <app_code> [step_number]`\n\n" +
            "ဥပမာ (တစ်ခုတည်းဖျက်ရန်): `/deletevpnguide NETMOD 1`\n" +
            "ဥပမာ (အားလုံးဖျက်ရန်): `/deletevpnguide NETMOD`",
            'Markdown', null, botKeyValue);
        return;
    }

    const appCode = args[0].toUpperCase();
    const stepNumber = args.length === 2 ? parseInt(args[1], 10) : null;

    let successCount = 0;
    let failedCount = 0;
    let messageText = "";

    if (stepNumber) {
        // Delete a specific step
        const fullKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${stepNumber}`;
        const success = await deleteData(env, 'SALES_DATA', fullKey);
        if (success) {
            successCount++;
            messageText = `✅ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`;
        } else {
            failedCount++;
            messageText = `❌ <b>${appCode}</b> Guide Step <b>${stepNumber}</b> ကို ရှာမတွေ့ပါ သို့မဟုတ် ဖျက်၍မရပါ။`;
        }
    } else {
        // Delete all steps for the app
        const prefix = `${VPN_GUIDE_KEY_PREFIX}${appCode}:`;
        const allKeys = await listKeys(env, 'SALES_DATA', prefix);
        if (allKeys.length === 0) {
            messageText = `❌ <b>${appCode}</b> အတွက် VPN Guide များ မရှိသေးပါ။`;
        } else {
            for (const key of allKeys) {
                const success = await deleteData(env, 'SALES_DATA', key);
                if (success) {
                    successCount++;
                } else {
                    failedCount++;
                }
            }
            messageText = `✅ <b>${appCode}</b> အတွက် VPN Guide ${successCount} ခုကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။`;
            if (failedCount > 0) {
                messageText += ` (${failedCount} ခု ဖျက်မရခဲ့ပါ။)`;
            }
        }
    }

    await sendMessage(token, chatId, messageText, 'HTML', null, botKeyValue);
}

/**
 * Handles the /listvpnguides command to list configured VPN usage guides.
 * Command format: /listvpnguides [app_code]
 * If app_code is not provided, lists all apps with guides.
 * If app_code is provided, lists all steps for that app.
 */
export async function handleListVpnGuidesCommand(message, token, env, botKeyValue) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const args = message.text.split(' ').slice(1);

    if (!OWNER_ADMIN_IDS.includes(userId)) {
        await sendMessage(token, chatId, "❌ သင်သည် Admin မဟုတ်ပါ။ ဤ command ကို အသုံးပြုခွင့်မရှိပါ။", 'HTML', null, botKeyValue);
        return;
    }

    let text = "";
    const appCode = args.length === 1 ? args[0].toUpperCase() : null;

    if (appCode) {
        // List steps for a specific app
        const prefix = `${VPN_GUIDE_KEY_PREFIX}${appCode}:`;
        const allKeys = await listKeys(env, 'SALES_DATA', prefix);

        if (allKeys.length === 0) {
            text = `<b>${appCode}</b> အတွက် VPN Guide များ မရှိသေးပါ။`;
        } else {
            // Find display name from step 1
            const stepOneData = await retrieveData(env, 'SALES_DATA', `${VPN_GUIDE_KEY_PREFIX}${appCode}:1`);
            const displayName = stepOneData?.display_name || appCode;

            text = `📚 <b>${displayName} (${appCode})</b> အသုံးပြုနည်းလမ်းညွှန်များ:\n\n`;
            const guideSteps = [];
            for (const fullKey of allKeys) {
                const data = await retrieveData(env, 'SALES_DATA', fullKey);
                if (data) {
                    guideSteps.push(data);
                }
            }
            guideSteps.sort((a, b) => a.step_number - b.step_number); // Sort by step number

            for (const step of guideSteps) {
                text += `<b>Step ${step.step_number}:</b> ${step.text}\n`;
                if (step.image_file_id) {
                    text += `  - ပုံ File ID: <code>${step.image_file_id}</code>\n`;
                }
                if (step.download_link) {
                    text += `  - Download Link: <a href="${step.download_link}">Link</a>\n`;
                }
                text += "\n";
            }
        }
    } else {
        // List all apps that have guides
        const allGuideKeys = await listKeys(env, 'SALES_DATA', VPN_GUIDE_KEY_PREFIX);
        const uniqueAppCodes = new Set();
        // Collect all app codes
        for (const fullKey of allGuideKeys) {
            const parts = fullKey.split(':');
            if (parts.length >= 2) {
                uniqueAppCodes.add(parts[1]); // app_code is the second part
            }
        }

        if (uniqueAppCodes.size === 0) {
            text = "VPN Guide များ မရှိသေးပါ။";
        } else {
            text = `📚 <b>VPN Guide Applications:</b>\n\n`;
            const appNames = [];
            // Fetch display name for each app code (using step 1)
            for (const code of Array.from(uniqueAppCodes).sort()) {
                const stepOneData = await retrieveData(env, 'SALES_DATA', `${VPN_GUIDE_KEY_PREFIX}${code}:1`);
                const displayName = stepOneData?.display_name || code;
                appNames.push({ code, displayName });
            }

            // Sort by display name
            appNames.sort((a, b) => a.displayName.localeCompare(b.displayName));
            
            for (const app of appNames) {
                text += `  - <b>${app.displayName}</b> (Code: <code>${app.code}</code>)\n`;
            }
            text += `\nအသေးစိတ်ကြည့်ရန်: <code>/listvpnguides &lt;app_code&gt;</code>`;
        }
    }

    const messageChunks = splitMessage(text);
    for (let i = 0; i < messageChunks.length; i++) {
        await sendMessage(token, chatId, messageChunks[i], 'HTML', null, botKeyValue);
        if (messageChunks.length > 1 && i < messageChunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}


// --- User-Facing Functions for VPN Guide ---

/**
 * Handles the 'show_vpn_guide_menu' callback query.
 * Displays a menu of VPN applications for which guides are available.
 */
export async function handleShowVpnGuideMenu(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id; // Get the original message ID

    await answerCallbackQuery(token, callbackQuery.id, "VPN အသုံးပြုနည်းလမ်းညွှန်များကို ပြသပါမည်။", true);

    const allGuideKeys = await listKeys(env, 'SALES_DATA', VPN_GUIDE_KEY_PREFIX);
    const uniqueAppCodes = new Set();
    for (const fullKey of allGuideKeys) {
        const parts = fullKey.split(':');
        if (parts.length >= 2) {
            uniqueAppCodes.add(parts[1]); // app_code is the second part
        }
    }

    let dynamicButtons = [];
    if (uniqueAppCodes.size > 0) {
        const buttonsData = [];
        // Fetch display name for each unique app code
        for (const code of Array.from(uniqueAppCodes).sort()) {
            // Retrieve step 1 data to get the display_name
            const guideData = await retrieveData(env, 'SALES_DATA', `${VPN_GUIDE_KEY_PREFIX}${code}:1`);
            const displayName = guideData?.display_name || code; // Fallback to code if name not found
            if (guideData) {
                 buttonsData.push({ code: code, displayName: displayName });
            }
        }
        
        // Sort by display name
        buttonsData.sort((a, b) => a.displayName.localeCompare(b.displayName));

        // Create buttons using display name
        for (const app of buttonsData) {
            dynamicButtons.push([{
                // MODIFIED: Use displayName for button text
                text: `${app.displayName} အသုံးပြုနည်း`, 
                callback_data: `show_vpn_guide_${app.code}_step_1` // Start from step 1
            }]);
        }
    } else {
        dynamicButtons.push([{
            text: "VPN အသုံးပြုနည်းလမ်းညွှန်များ မရှိသေးပါ။",
            callback_data: "menu_support" // Direct to support if no guides
        }]);
    }

    // Replace the existing BACK_TO_VPN_GUIDE_MENU_BUTTON with a new one that has the desired callback_data
    // This ensures we're not modifying the imported constant directly but creating a new object for the reply_markup.
    const backToPreviousMenuButton = { 
        text: "↩️ နောက်သို့ (Main Menu)", 
        callback_data: "main_menu" // Back to main menu
    };

    const replyMarkup = {
        inline_keyboard: dynamicButtons.concat([
            [backToPreviousMenuButton] // Use the newly defined button
        ])
    };

    try {
        // FIX: Delete the previous message (which might be a photo) and send a new text message.
        // This avoids "Bad Request: there is no text in the message to edit" error.
        await deleteMessage(token, chatId, messageId, botKeyValue); 
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    } catch (e) {
        console.error(`[handleShowVpnGuideMenu] Error deleting or sending message: ${e.message}`);
        // Fallback: If delete fails, just try to send a new message.
        await sendMessage(token, chatId, VPN_GUIDE_MENU_TEXT, 'HTML', replyMarkup, botKeyValue);
    }
}

/**
 * Handles 'show_vpn_guide_<app_code>_step_<step_number>' callbacks.
 * Displays a specific step of the VPN usage guide for a chosen application.
 */
export async function handleShowSpecificVpnGuide(callbackQuery, token, env, botKeyValue) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data; // e.g., 'show_vpn_guide_NETMOD_step_1'

    const parts = data.split('_');
    const appCode = parts[3]; // e.g., 'NETMOD'
    const currentStepNumber = parseInt(parts[5], 10); // e.g., 1

    await answerCallbackQuery(token, callbackQuery.id); // Dismiss loading

    const currentGuideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${currentStepNumber}`;
    const guideData = await retrieveData(env, 'SALES_DATA', currentGuideKey);

    if (!guideData) {
        try {
            await deleteMessage(token, chatId, messageId, botKeyValue); // Try to delete the old message
            await sendMessage(token, chatId, `❌ <b>${appCode}</b> အတွက် Step ${currentStepNumber} ကို ရှာမတွေ့ပါ။`, 'HTML', {
                inline_keyboard: [
                    [BACK_TO_VPN_GUIDE_MENU_BUTTON]
                ]
            }, botKeyValue);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error handling missing guide step: ${e.message}`);
            await sendMessage(token, chatId, `❌ <b>${appCode}</b> အတွက် Step ${currentStepNumber} ကို ရှာမတွေ့ပါ။`, 'HTML', {
                inline_keyboard: [
                    [BACK_TO_VPN_GUIDE_MENU_BUTTON]
                ]
            }, botKeyValue);
        }
        return;
    }

    const nextStepNumber = currentStepNumber + 1;
    const prevStepNumber = currentStepNumber - 1;

    const nextGuideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${nextStepNumber}`;
    const prevGuideKey = `${VPN_GUIDE_KEY_PREFIX}${appCode}:${prevStepNumber}`;

    const hasNext = await retrieveData(env, 'SALES_DATA', nextGuideKey);
    const hasPrev = await retrieveData(env, 'SALES_DATA', prevGuideKey);
    
    // Use display_name from guideData, fallback to appCode if not available
    const displayName = guideData.display_name || appCode;

    let dynamicButtons = [];

    if (guideData.download_link) {
        dynamicButtons.push([{
            // MODIFIED: Use displayName in button text
            text: `⬇️ ${displayName} Download Link`,
            url: guideData.download_link
        }]);
    }

    // Navigation buttons
    let navButtons = [];
    if (hasPrev) {
        navButtons.push({
            text: "⬅️ Prev",
            callback_data: `show_vpn_guide_${appCode}_step_${prevStepNumber}`
        });
    }
    
    // FIX: Calculate total steps and display as "current / total"
    const prefix = `${VPN_GUIDE_KEY_PREFIX}${appCode}:`;
    const allGuideStepsKeys = await listKeys(env, 'SALES_DATA', prefix);
    const totalSteps = allGuideStepsKeys.length;

    navButtons.push({
        text: `${currentStepNumber} / ${totalSteps}`, // Display current step / total steps
        callback_data: 'noop' // No operation, just shows current step
    });
    if (hasNext) {
        navButtons.push({
            text: "Next ➡️",
            callback_data: `show_vpn_guide_${appCode}_step_${nextStepNumber}`
        });
    }
    if (navButtons.length > 0) {
        dynamicButtons.push(navButtons);
    }

    dynamicButtons.push([BACK_TO_VPN_GUIDE_MENU_BUTTON]); // Back to main guide menu

    const replyMarkup = {
        inline_keyboard: dynamicButtons
    };

    // MODIFIED: Use displayName in caption text
    const captionText = `📚 <b>${displayName} - အသုံးပြုနည်း (Step ${currentStepNumber}):</b>\n\n${guideData.text}`;

    if (guideData.image_file_id) {
        // Send photo with caption
        try {
            // Delete previous message if it was a photo or edited text
            await deleteMessage(token, chatId, messageId, botKeyValue);
            await sendPhoto(token, chatId, guideData.image_file_id, captionText, replyMarkup, botKeyValue);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error sending photo or deleting message: ${e.message}`);
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup, botKeyValue); // Fallback to text
        }
    } else {
        // Edit message text
        try {
            await editMessageText(token, chatId, messageId, captionText, 'HTML', replyMarkup, botKeyValue);
        } catch (e) {
            console.error(`[handleShowSpecificVpnGuide] Error editing message text: ${e.message}`);
            await sendMessage(token, chatId, captionText, 'HTML', replyMarkup, botKeyValue); // Fallback to text
        }
    }
}

