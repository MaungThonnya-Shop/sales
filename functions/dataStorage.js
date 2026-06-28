// functions/dataStorage.js

import { WELCOME_MESSAGE_KEY, WELCOME_PHOTO_KEY } from './constants.js';

/**
 * Stores general data in the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'USER_DATA', 'SALES_DATA').
 * @param {string} key - The unique key for the data.
 * @param {object} data - The object to store.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeData(env, namespaceName, key, data) {
    console.log(`[storeData] Attempting to store data in '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[storeData] KV namespace '${namespaceName}' is not bound. Cannot store data.`);
        return false;
    }
    try {
        // Data ကို JSON string အဖြစ်ပြောင်းပြီး သိမ်းဆည်းခြင်း။
        await kvNamespace.put(key, JSON.stringify(data));
        console.log(`[storeData] Stored data in '${namespaceName}' for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[storeData] Error storing data in '${namespaceName}' for key ${key}:`, error);
        return false;
    }
}

/**
 * Retrieves general data from the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'USER_DATA', 'SALES_DATA').
 * @param {string} key - The unique key for the data.
 * @returns {Promise<object|null>} - The retrieved object or null if not found/error.
 */
export async function retrieveData(env, namespaceName, key) {
    console.log(`[retrieveData] Attempting to retrieve data from '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[retrieveData] KV namespace '${namespaceName}' is not bound. Cannot retrieve data.`);
        return null;
    }
    try {
        // Data ကို JSON အဖြစ် retrieve လုပ်ခြင်း။
        const value = await kvNamespace.get(key, { type: 'json' });
        console.log(`[retrieveData] Retrieved data from '${namespaceName}' for key: ${key}: ${JSON.stringify(value)}`);
        return value;
    } catch (error) {
        console.error(`[retrieveData] Error retrieving data from '${namespaceName}' for key ${key}:`, error);
        return null;
    }
}

/**
 * Deletes general data from the specified KV namespace.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'USER_DATA', 'SALES_DATA').
 * @param {string} key - The unique key for the data.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteData(env, namespaceName, key) {
    console.log(`[deleteData] Attempting to delete data from '${namespaceName}' for key: ${key}`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[deleteData] KV namespace '${namespaceName}' is not bound. Cannot delete data.`);
        return false;
    }
    try {
        await kvNamespace.delete(key);
        console.log(`[deleteData] Deleted data from '${namespaceName}' for key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[deleteData] Error deleting data from '${namespaceName}' for key ${key}:`, error);
        return false;
    }
}

/**
 * Lists all keys in a specified KV namespace with an optional prefix.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} namespaceName - The name of the KV namespace (e.g., 'USER_DATA', 'SALES_DATA').
 * @param {string} prefix - Optional prefix to filter keys.
 * @returns {Promise<Array<string>>} - An array of matching keys.
 */
export async function listKeys(env, namespaceName, prefix = '') {
    console.log(`[listKeys] Listing keys in '${namespaceName}' with prefix: '${prefix}'`);
    const kvNamespace = env[namespaceName];
    if (!kvNamespace) {
        console.error(`[listKeys] KV namespace '${namespaceName}' is not bound. Cannot list keys.`);
        return [];
    }
    try {
        const { keys } = await kvNamespace.list({ prefix: prefix });
        return keys.map(key => key.name);
    } catch (error) {
        console.error(`[listKeys] Error listing keys in '${namespaceName}' with prefix '${prefix}':`, error);
        return [];
    }
}


// --- VPN Key Management ---

/**
 * Stores a VPN key in the SALES_DATA KV namespace.
 * Key format: vpn_key:<operator_code>:<key_type>:<unique_id>
 * MODIFIED: Added operatorCode parameter.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The operator code (e.g., 'DTAC', 'TRUE', 'AIS').
 * @param {string} keyType - The type of VPN key (e.g., 'NOPRO', 'DNS', 'GAMEPLAN').
 * @param {string} keyContent - The actual VPN key string.
 * @param {string} status - 'available', 'trial', 'sold'.
 * @param {string|null} assignedToUserId - User ID if assigned.
 * @param {number|null} expirationTime - Unix timestamp if expires.
 * @returns {Promise<string|null>} - The unique ID of the stored key, or null if failed.
 */
export async function storeVpnKey(env, operatorCode, keyType, keyContent, status = 'available', assignedToUserId = null, expirationTime = null) {
    // Unique ID ကို စနစ်တကျ ထုတ်ပေးခြင်း
    const uniqueId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // MODIFIED: New key format includes operatorCode
    const fullKey = `vpn_key:${operatorCode}:${keyType}:${uniqueId}`;
    const data = {
        key: keyContent,
        status: status,
        assigned_to: assignedToUserId,
        expiration_time: expirationTime,
        created_at: Date.now()
    };
    const success = await storeData(env, 'SALES_DATA', fullKey, data);
    return success ? uniqueId : null;
}

/**
 * Retrieves a VPN key by its full key (vpn_key:<operator_code>:<key_type>:<key_id>).
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fullKey - The full key string (e.g., 'vpn_key:DTAC:DNS_50_ဘတ္:xyz').
 * @returns {Promise<object|null>} - The VPN key data or null.
 */
export async function getVpnKey(env, fullKey) {
    return await retrieveData(env, 'SALES_DATA', fullKey);
}

/**
 * Retrieves a VPN key by its unique ID.
 * This function lists all vpn_key: keys across all operators and finds by unique ID.
 * MODIFIED: Adjusted to handle new key format.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} uniqueId - The unique ID of the key (e.g., 'xyz').
 * @returns {Promise<object|null>} - { fullKey: string, vpnKeyData: object } or null.
 */
export async function getVpnKeyByUniqueId(env, uniqueId) {
    const allKeys = await listKeys(env, 'SALES_DATA', 'vpn_key:'); // List all VPN keys regardless of operator
    for (const fullKey of allKeys) {
        const parts = fullKey.split(':');
        // Check if the key format is correct (e.g., "vpn_key:OPERATOR:KEY_TYPE:UNIQUE_ID") and the uniqueId matches
        if (parts.length === 4 && parts[3] === uniqueId) { // MODIFIED: parts.length is now 4, uniqueId is at index 3
            const vpnKeyData = await retrieveData(env, 'SALES_DATA', fullKey);
            if (vpnKeyData) {
                return { fullKey: fullKey, vpnKeyData: vpnKeyData };
            }
        }
    }
    return null;
}

/**
 * Deletes a VPN key by its unique ID.
 * MODIFIED: Adjusted to handle new key format and search across all operators.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} keyId - The unique ID of the key (e.g., 'xyz').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteVpnKey(env, keyId) {
    const allKeys = await listKeys(env, 'SALES_DATA', 'vpn_key:'); // List all VPN keys regardless of operator
    let foundKey = null;
    for (const fullKey of allKeys) {
        const parts = fullKey.split(':');
        // MODIFIED: parts.length is now 4, keyId (uniqueId) is at index 3
        if (parts.length === 4 && parts[3] === keyId) {
            foundKey = fullKey;
            break;
        }
    }
    if (foundKey) {
        return await deleteData(env, 'SALES_DATA', foundKey);
    }
    return false;
}

/**
 * Updates the status of a VPN key.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fullKey - The full key string (e.g., 'vpn_key:DTAC:DNS_50_ဘတ္:xyz').
 * @param {string} newStatus - The new status ('available', 'trial', 'sold').
 * @param {string|null} assignedToUserId - User ID if assigned.
 * @param {number|null} expirationTime - Unix timestamp if expires.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updateVpnKeyStatus(env, fullKey, newStatus, assignedToUserId = null, expirationTime = null) {
    const vpnKeyData = await retrieveData(env, 'SALES_DATA', fullKey);
    if (vpnKeyData) {
        vpnKeyData.status = newStatus;
        vpnKeyData.assigned_to = assignedToUserId;
        vpnKeyData.expiration_time = expirationTime;
        // The rest of the data (key, created_at) remains the same.
        return await storeData(env, 'SALES_DATA', fullKey, vpnKeyData);
    }
    return false;
}


// --- User Trial Status Management ---

/**
 * Stores or updates a user's trial status.
 * Key format: user_trial_status:<user_id>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The ID of the user.
 * @param {boolean} hasTakenTrial - True if the user has taken a trial.
 * @param {string|null} trialKeyId - The ID of the trial key assigned.
 * @param {number|null} trialExpirationTime - Unix timestamp of trial expiration.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeUserTrialStatus(env, userId, hasTakenTrial, trialKeyId = null, trialExpirationTime = null) {
    const fullKey = `user_trial_status:${userId}`;
    const data = {
        has_taken_trial: hasTakenTrial,
        trial_key_id: trialKeyId,
        trial_expiration_time: trialExpirationTime,
        last_updated: Date.now()
    };
    return await storeData(env, 'SALES_DATA', fullKey, data);
}

/**
 * Retrieves a user's trial status.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object|null>} - The user's trial status data or null.
 */
export async function getUserTrialStatus(env, userId) {
    const fullKey = `user_trial_status:${userId}`;
    return await retrieveData(env, 'SALES_DATA', fullKey);
}


// --- Product Price Management (New functions for admin commands) ---

/**
 * Sets or updates a product's price.
 * Key format: product_price:<type>:<product_id>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} productType - 'mlbb', 'pubg', or 'vpn'.
 * @param {string} productId - Unique ID for the product (e.g., '86_diamonds', 'DNS_50_ဘတ္').
 * @param {string} productName - Display name of the product (e.g., '86 Diamonds', 'DNS 50 ဘတ် VIP Key').
 * @param {string} price - The price string (e.g., '2,000 MMK', '50 Baht').
 * @param {string|null} fileId - Optional: Telegram file_id for the product's image.
 * @param {string|null} description - Optional: Detailed description of the product.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function setProductPrice(env, productType, productId, productName, price, fileId = null, description = null) {
    const fullKey = `product_price:${productType}:${productId}`;
    const data = {
        name: productName,
        price: price,
        file_id: fileId, // New field for product image file ID
        description: description, // New field for product description
        last_updated: Date.now()
    };
    return await storeData(env, 'SALES_DATA', fullKey, data);
}

/**
 * Deletes a product's price.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} productType - 'mlbb', 'pubg', or 'vpn'.
 * @param {string} productId - Unique ID for the product.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteProductPrice(env, productType, productId) {
    const fullKey = `product_price:${productType}:${productId}`;
    return await deleteData(env, 'SALES_DATA', fullKey);
}

/**
 * Lists all products of a given type.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} productType - 'mlbb', 'pubg', or 'vpn'.
 * @returns {Promise<Array<object>>} - An array of product objects, including name, price, file_id, and description.
 */
export async function listProducts(env, productType) {
    const prefix = `product_price:${productType}:`;
    const allKeys = await listKeys(env, 'SALES_DATA', prefix);
    const products = [];
    for (const fullKey of allKeys) {
        const productData = await retrieveData(env, 'SALES_DATA', fullKey);
        if (productData) {
            products.push(productData);
        }
    }
    // Sort products by their name or a logical order if needed
    return products.sort((a, b) => a.name.localeCompare(b.name));
}


// --- Payment Details Management ---

/**
 * Stores payment transaction details.
 * Key format: payment:<transaction_id>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @param {object} details - Object containing payment details.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storePaymentDetails(env, transactionId, details) {
    const fullKey = `payment:${transactionId}`;
    return await storeData(env, 'SALES_DATA', fullKey, details);
}

/**
 * Retrieves payment transaction details.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @returns {Promise<object|null>} - The payment details object or null.
 */
export async function getPaymentDetails(env, transactionId) {
    const fullKey = `payment:${transactionId}`;
    return await retrieveData(env, 'SALES_DATA', fullKey);
}

/**
 * Updates the status of a payment transaction.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} transactionId - Unique ID for the transaction.
 * @param {string} newStatus - The new status ('pending', 'awaiting_admin_review', 'verified', 'rejected').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updatePaymentStatus(env, transactionId, newStatus) {
    const paymentDetails = await getPaymentDetails(env, transactionId);
    if (paymentDetails) {
        paymentDetails.status = newStatus;
        paymentDetails.last_updated = Date.now();
        return await storeData(env, 'SALES_DATA', `payment:${transactionId}`, paymentDetails);
    }
    return false;
}

/**
 * Deletes user data from the USER_DATA KV namespace.
 * This is a general user data deletion, not specific to trial status.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteUserDataFromKV(env, userId) {
    const fullKey = `user_data:${userId}`; // Assuming user data is stored with this prefix
    return await deleteData(env, 'USER_DATA', fullKey);
}

// --- Welcome Message/Photo Management ---

/**
 * Stores the bot's welcome message text.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} messageText - The welcome message text.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeWelcomeMessage(env, messageText) {
    const data = { text: messageText, last_updated: Date.now() };
    return await storeData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY, data);
}

/**
 * Retrieves the bot's welcome message text.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<string|null>} - The welcome message text or null.
 */
export async function getWelcomeMessage(env) {
    const data = await retrieveData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY);
    return data ? data.text : null;
}

/**
 * Stores the bot's welcome photo file ID.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} fileId - The Telegram file_id of the photo.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeWelcomePhoto(env, fileId) {
    const data = { file_id: fileId, last_updated: Date.now() };
    return await storeData(env, 'SALES_DATA', WELCOME_PHOTO_KEY, data);
}

/**
 * Retrieves the bot's welcome photo file ID.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<string|null>} - The Telegram file_id of the photo or null.
 */
export async function getWelcomePhoto(env) {
    const data = await retrieveData(env, 'SALES_DATA', WELCOME_PHOTO_KEY);
    return data ? data.file_id : null;
}

/**
 * Deletes the bot's welcome message.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteWelcomeMessage(env) {
    return await deleteData(env, 'SALES_DATA', WELCOME_MESSAGE_KEY);
}

/**
 * Deletes the bot's welcome photo.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteWelcomePhoto(env) {
    return await deleteData(env, 'SALES_DATA', WELCOME_PHOTO_KEY);
}

// --- New Operator Button Management ---

/**
 * Stores an operator button.
 * Key format: vpn_operator_button:<operator_code>
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator (e.g., 'DTAC', 'TRUE', 'AIS').
 * @param {string} operatorName - The display name for the operator (e.g., 'DTAC', 'True Move H').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function storeVpnOperatorButton(env, operatorCode, operatorName) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    const data = {
        name: operatorName,
        created_at: Date.now()
    };
    return await storeData(env, 'SALES_DATA', fullKey, data);
}

/**
 * Retrieves an operator button by its code.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator.
 * @returns {Promise<object|null>} - The operator button data or null.
 */
export async function getVpnOperatorButton(env, operatorCode) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    return await retrieveData(env, 'SALES_DATA', fullKey);
}

/**
 * Deletes an operator button.
 * @param {object} env - The Cloudflare environment object.
 * @param {string} operatorCode - The unique code for the operator.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteVpnOperatorButton(env, operatorCode) {
    const fullKey = `vpn_operator_button:${operatorCode}`;
    return await deleteData(env, 'SALES_DATA', fullKey);
}

/**
 * Lists all stored VPN operator buttons.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Promise<Array<object>>} - An array of operator button objects.
 */
export async function listVpnOperatorButtons(env) {
    const prefix = `vpn_operator_button:`;
    const allKeys = await listKeys(env, 'SALES_DATA', prefix);
    const buttons = [];
    for (const fullKey of allKeys) {
        const buttonData = await retrieveData(env, 'SALES_DATA', fullKey);
        if (buttonData) {
            const operatorCode = fullKey.split(':')[1];
            buttons.push({ code: operatorCode, name: buttonData.name });
        }
    }
    // Sort alphabetically by operator name
    return buttons.sort((a, b) => a.name.localeCompare(b.name));
}
