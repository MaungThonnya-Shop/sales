// functions/constants.js

// Telegram Bot API base URL
export const TELEGRAM_API = "https://api.telegram.org/bot";

// Global variable to store bot ID after first fetch for efficient passive mode check
export let botIdCache = null;

// Bot Developer's Contact Information (Hardcoded for direct contact)
export const ADMIN_USERNAME = "@Zero_Free_Vpn"; // Your Telegram Username (without @)
export const SUPPORT_GROUP_LINK = "https://t.me/zero_freevpn"; // Your Telegram Support Group Link

// Bot Owner/Admin User IDs for THIS Public User Bot - Pre-filled with user's provided ID
// These IDs will be able to use the /setkey, /key, /deletekey etc. commands on THIS bot.
export const OWNER_ADMIN_IDS = [7576434717, 7240495054]; // <--- REPLACE WITH YOUR OWN TELEGRAM USER IDs (e.g., [123456789, 987654321])

// KBank Payment Details (Thailand)
export const KBANK_ACCOUNT_NAME = "𝗠𝗿 𝗠𝘆𝗮𝘁 𝗧𝗵𝘂"; // Replace with your KBank account name (e.g., "John Doe")
export const KBANK_ACCOUNT_NUMBER = "158-3-91470-2"; // Replace with your KBank account number (e.g., "123-4-56789-0")
export const KBANK_QR_CODE_FILE_ID = "AgACAgUAAxkBAAO3akDioGpZD4HaWsZrKlnxe6yU07sAAjkPaxsI0PhVMlphWnouIEEBAAMCAAN5AAM8BA"; // <--- QR Code file_id ကို ဒီနေရာမှာ ထည့်ပါ။
export const KBANK_QR_CODE_URL = ""; // file_id သုံးမှာမို့ URL မလိုပါဘူး။ Empty ထားပါ။


// --- Sales Bot Specific Constants ---

// Function to create a button for going back to the main menu
export const BACK_TO_MAIN_MENU_BUTTON = { text: "↩️ နောက်သို့", callback_data: "main_menu" };

// NEW: Button to go directly to the VPN Operator Selection Menu (Home for VPN flow)
export const HOME_TO_OPERATOR_MENU_BUTTON = { text: "🏠 Home (VPN Menu)", callback_data: "vpn_buy" };


// Main Menu Text and Commands
export const MAIN_MENU_TEXT = `မောင်သုည - အကောင်းဆုံး နဲ့ မြန်ဆန်သော ဒစ်ဂျစ်တယ် ဝန်ဆောင်မှုများဖြင့် ယုံကြည့်စိတ်ချရသော Private VPN များကို အခုပဲ ရယူလိုက်ပါ။`;
export const MAIN_MENU_BUTTONS = [
    [{ text: "⚡ VPN Services", callback_data: "menu_vpn" }],
    [{ text: "💎 MLBB Diamonds", callback_data: "menu_mlbb" }],
    [{ text: "🎮 PUBG UC", callback_data: "menu_pubg" }],
    [{ text: "💸 ငွေလွှဲဝန်ဆောင်မှု", callback_data: "menu_money_transfer" }],
    [{ text: "❓ အကူအညီ / ဆက်သွယ်ရန်", callback_data: "menu_support" }]
];

// VPN Menu (Now leads to operator selection)
export const VPN_MENU_TEXT = `VPN ဝန်ဆောင်မှုများ:`;
export const VPN_MENU_BUTTONS = [
    [{ text: "💰 VPN Key ဝယ်ယူရန်", callback_data: "vpn_select_operator" }], // MODIFIED: New callback for operator selection
    [BACK_TO_MAIN_MENU_BUTTON]
];

// New VPN Operator Selection Menu
export const VPN_OPERATOR_MENU_TEXT = `🇲🇲မြန်မာ + 🇹🇭ထိုင်း ယုံကြည်စိတ်ချပြီး မြန်ဆန်သော FastSpeed⚡ VPN ဝန်ဆောင်မှုများကို Operator အလိုက် စိတ်ကြိုက်ကြည့်ရှုပြီး ရွေးခြယ်ဝယ်ယူနိူင်ပါသည်။`;
// This will be dynamically populated by admin commands, so no default buttons here.

// MLBB Menu (Example packages - these will now be dynamically fetched from KV)
export const MLBB_MENU_TEXT = `MLBB Diamond ဈေးနှုန်းများ:`;
// MLBB_PACKAGES array is removed as products will be fetched from KV.
// MLBB_MENU_BUTTONS will be dynamically generated in salesHandlers.js
export const MLBB_MENU_BUTTONS = [[BACK_TO_MAIN_MENU_BUTTON]]; 

// PUBG UC Menu (Example packages - these will now be dynamically fetched from KV)
export const PUBG_MENU_TEXT = `PUBG UC ဈေးနှုန်းများ:`;
// PUBG_PACKAGES array is removed as products will be fetched from KV.
// PUBG_MENU_BUTTONS will be dynamically generated in salesHandlers.js
export const PUBG_MENU_BUTTONS = [[BACK_TO_MAIN_MENU_BUTTON]];

// New VPN Sub-menu for different key types (e.g., DNS 50 ဘတ်)
// MODIFIED: Text now specifies for a specific operator
export const VPN_KEY_TYPES_MENU_TEXT = (operatorName) => `<b>${operatorName}</b> အတွက် ယနေ့ ရရှိနိူင်သော ​FastSpeed VPN ဝန်ဆောင်မှုများကို စိတ်ကြိုက် ရွေးခြယ်ဝယ်ယူနိူင်ပါသည်။:`;
// This button array will be populated dynamically from KV storage
// The back button will now go to the operator selection menu
export const VPN_KEY_TYPES_BUTTONS = (operatorCode) => [
    // This is a placeholder. The actual buttons will be fetched from KV
    [{ text: "↩️ နောက်သို့", callback_data: "vpn_select_operator" }] // MODIFIED: Back to operator selection
];


// Final Key Selection Menu
export const VPN_FINAL_KEY_MENU_TEXT = (keyType) => `သင်ရွေးချယ်ထားသော "${keyType}" အတွက် အစမ်းသုံး (သို့မဟုတ်) ဝယ်ယူရန် ရွေးချယ်နိုင်ပါသည်:`;
export const VPN_FINAL_KEY_BUTTONS = (keyType) => ([
    [{ text: "🔑 အစမ်းသုံး VPN Key (၂ နာရီ)", callback_data: `vpn_select_trial_${keyType}` }],
    [{ text: "💰 VIP KEY ဝယ်ယူရန်", callback_data: `vpn_select_buy_${keyType}` }],
    [{ text: "↩️ နောက်သို့", callback_data: "vpn_buy" }] // Back button to the VPN key types menu
]);


// Money Transfer Menu
export const MONEY_TRANSFER_TEXT = `မြန်မာနိုင်ငံသို့ ငွေလွှဲဝန်ဆောင်မှု:
(Rate သည် နေ့စဥ် ပြောင်းလဲနိုင်ပါသည်။)

လက်ရှိ ငွေလွှဲနှုန်းထားများနှင့် အသေးစိတ်ကို သိရှိလိုပါက အောက်ပါ လင့်ခ်မှတစ်ဆင့် ကျွန်တော်တို့ဆီသို့ ဆက်သွယ်မေးမြန်းနိုင်ပါတယ်။

📞 ဆက်သွယ်ရန်: ${ADMIN_USERNAME}
🔗 Support Group: ${SUPPORT_GROUP_LINK}
`;
export const MONEY_TRANSFER_BUTTONS = [
    [BACK_TO_MAIN_MENU_BUTTON]
];

// Support/Contact Menu
export const SUPPORT_MENU_TEXT = `အကူအညီလိုအပ်ပါက သို့မဟုတ် ဝန်ဆောင်မှုများနှင့် ပတ်သက်၍ မေးမြန်းလိုပါက <b>Admin</b> ကို ဆက်သွယ်နိုင်ပါတယ်:

📞 Admin: ${ADMIN_USERNAME}
🔗 Support Group: ${SUPPORT_GROUP_LINK}
`;
export const SUPPORT_MENU_BUTTONS = [
    [BACK_TO_MAIN_MENU_BUTTON]
];


// Trial VPN Key Specific Constants
export const TRIAL_VPN_DURATION_HOURS = 2; // 2 hours trial
export const TRIAL_VPN_COOLDOWN_DAYS = 2; // 2 days cooldown for trial
export const TRIAL_VPN_LIMIT_PER_USER = 1; // Only one trial key per user (within cooldown period)

export const TRIAL_VPN_KEY_PREFIX = "trial_vpn:"; // KV key prefix for trial VPNs
export const USER_TRIAL_STATUS_PREFIX = "user_trial_status:"; // KV key prefix to track user trial status


// --- NEW VPN Guide Constants ---
export const VPN_GUIDE_KEY_PREFIX = "vpn_guide:"; // KV key prefix for VPN usage guides

export const VPN_GUIDE_MENU_TEXT = `အောက်ပါ VPN Application များ၏ အသုံးပြုနည်းများကို ရွေးချယ်ကြည့်ရှုနိုင်ပါသည်:`;

// Button to be sent after VPN key delivery
export const VPN_GUIDE_BUTTON = (transactionId) => ({ // Add transactionId if needed for context
    inline_keyboard: [
        [{ text: "📚 VPN အသုံးပြုနည်းလမ်းညွှန်", callback_data: "show_vpn_guide_menu" }]
    ]
});

// Back button for VPN Guide steps
export const BACK_TO_VPN_GUIDE_MENU_BUTTON = { text: "↩️ နောက်သို့ (လမ်းညွှန်များ)", callback_data: "show_vpn_guide_menu" };


// Public Bot Admin Commands (e.g., /setkey, /key, /deletekey etc.)
// These IDs will be able to use the /setkey, /key, /deletekey etc. commands on THIS bot.
export const PUBLIC_BOT_ADMIN_COMMANDS = [
    "/setkey", "/key", "/deletekey", "/id", "/info", "/ban", "/mute", "/unban", "/unmute", "/summary",
    // New commands for sales management (will implement later)
    "/addvpn", "/deletevpn", "/listvpns", "/adduserkey", "/setmlbbprice", "/setpubgprice", "/verify_payment", "/listprices", "/deleteprice", "/viewpayment", "/reject_payment", "/resettrial",
    // New commands for price management
    "/setprice", "/deleteprice", "/listprices",
    // New commands for welcome message/photo management
    "/setwelcomemessage", "/deletewelcomemessage", "/setwelcomephoto", "/deletewelcomephoto",
    // New command for keyinfo
    "/keyinfo",
    // NEW: Operator button management commands
    "/setoperatorbutton", "/deleteoperatorbutton", "/listoperatorbuttons",
    // NEW: VPN Guide management commands
    "/addvpnguide", "/deletevpnguide", "/listvpnguides" 
];

// BLOCKED DOMAINS, APP_IDS, KEYWORDS_REGEX will be removed/ignored for this sales-only bot.
// If you still need them for general group management, please let me know.
export const BLOCKED_DOMAINS = [];
export const BLOCKED_APP_IDS = [];
export const BLOCKED_KEYWORDS_REGEX = [];

// New button for admin to view payment with a single click (for group notifications)
export const VIEW_PAYMENT_BUTTON = (transactionId) => ({
    inline_keyboard: [
        [{ text: "💸 ငွေပေးချေမှုမှတ်တမ်း ကြည့်ရန်", callback_data: `view_payment_${transactionId}` }]
    ]
});

// --- New Welcome Message Constants ---
export const WELCOME_MESSAGE_KEY = "bot_welcome_message"; // KV key for welcome message text
export const WELCOME_PHOTO_KEY = "bot_welcome_photo_file_id"; // KV key for welcome photo file ID

export const DEFAULT_WELCOME_MESSAGE = `
မောင်သုည - အကောင်းဆုံး နဲ့ မြန်ဆန်သော ဒစ်ဂျစ်တယ် ဝန်ဆောင်မှုများကို အခုပဲ ရယူလိုက်ပါ။ 

<b>✅ VPN Services</b> - အမြန်နှုန်းမြင့် VPN ဝန်ဆောင်မှုများဖြင့် အင်တာနက်လွတ်လပ်စွာသုံးစွဲပါ။

<b>✅ MLBB Diamonds</b> - Mobile Legends အတွက် Diamond များကို စျေးနှုန်းချိုသာစွာဖြင့် ရယူလိုက်ပါ။

<b>✅ PUBG UC</b> - PUBG Mobile UC များကို အမြန်ဆုံးပို့ဆောင်ပေးပါသည်။

<b>✅ ငွေလွှဲဝန်ဆောင်မှု</b> - ထိုင်းမှ မြန်မာသို့ လုံခြုံပြီးမြန်ဆန်သော ငွေလွှဲဝန်ဆောင်မှုများ။
`;

// Default welcome photo (use the uploaded image's file_id)
// Make sure this file_id is valid and accessible by your bot.
export const DEFAULT_WELCOME_PHOTO_FILE_ID = "AgACAgUAAxkBAAOFaI6eLO_qfv3h1kByVuYdIDYEpjwAAuXLMRu_1VhUcPOyaFZwVbUBAAMCAAN4AAM2BA"; // Replace with your actual image file_id if different

// Placeholder for a generic "no image" file ID if a product doesn't have a specific image
export const NO_IMAGE_PLACEHOLDER_FILE_ID = "AgACAgUAAxkBAAOFaI6eLO_qfv3h1kByVuYdIDYEpjwAAuXLMRu_1VhUcPOyaFZwVbUBAAMCAAN4AAM2BA"; // You might want to use a different generic image here
