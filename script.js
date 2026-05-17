const firebaseConfig = {
  apiKey: "AIzaSyBp8_xYdzYDamye0ggQiLM8c_3YCfbJ6-Y",
  authDomain: "webchat-sihab.firebaseapp.com",
  projectId: "webchat-sihab",
  storageBucket: "webchat-sihab.firebasestorage.app",
  messagingSenderId: "124112561955",
  appId: "1:124112561955:web:e0267ef845bb8dbc7f0e96",
  measurementId: "G-JKLWNBPXZQ"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db = firebase.firestore(app);
const realtimeDb = firebase.database(app);

const createUserWithEmailAndPassword = (authInstance, email, password) => authInstance.createUserWithEmailAndPassword(email, password);
const onAuthStateChanged = (authInstance, callback) => authInstance.onAuthStateChanged(callback);
const signInWithEmailAndPassword = (authInstance, email, password) => authInstance.signInWithEmailAndPassword(email, password);
const signOut = (authInstance) => authInstance.signOut();
const updatePassword = (user, password) => user.updatePassword(password);
const reauthenticateWithPassword = (user, password) => {
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
  return user.reauthenticateWithCredential(credential);
};
const firestoreServerTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const databaseServerTimestamp = () => firebase.database.ServerValue.TIMESTAMP;
const wrapDocument = (snapshot) => ({
  id: snapshot.id,
  exists: () => snapshot.exists,
  data: () => snapshot.data()
});
const collection = (dbInstance, ...pathParts) => dbInstance.collection(pathParts.join("/"));
const doc = (dbInstance, ...pathParts) => dbInstance.doc(pathParts.join("/"));
const getDoc = async (docRef) => wrapDocument(await docRef.get());
const getDocs = async (queryRef) => {
  const snapshot = await queryRef.get();
  return { docs: snapshot.docs.map(wrapDocument) };
};
const setDoc = (docRef, data, options) => docRef.set(data, options);
const updateDoc = (docRef, data) => docRef.update(data);
const deleteDoc = (docRef) => docRef.delete();
const addDoc = (collectionRef, data) => collectionRef.add(data);
const fieldDelete = () => firebase.firestore.FieldValue.delete();
const fieldIncrement = (amount) => firebase.firestore.FieldValue.increment(amount);
const where = (field, operator, value) => (queryRef) => queryRef.where(field, operator, value);
const orderBy = (field, direction) => (queryRef) => direction ? queryRef.orderBy(field, direction) : queryRef.orderBy(field);
const query = (queryRef, ...constraints) => constraints.reduce((nextQuery, constraint) => constraint(nextQuery), queryRef);
const onSnapshot = (queryRef, callback) => queryRef.onSnapshot((snapshot) => {
  callback({ docs: snapshot.docs.map(wrapDocument) });
});
const ref = (databaseInstance, path) => databaseInstance.ref(path);
const set = (databaseRef, value) => databaseRef.set(value);
const onValue = (databaseRef, callback) => {
  databaseRef.on("value", callback);
  return () => databaseRef.off("value", callback);
};
const onDisconnect = (databaseRef) => databaseRef.onDisconnect();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const encryptionKeyCache = new Map();
const outgoingVisibleChats = new Map();
const localConversationOrder = new Map();

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function chatEncryptionKey(chatId) {
  if (!chatId) throw new Error("Chat key pawa jay nai");
  if (encryptionKeyCache.has(chatId)) return encryptionKeyCache.get(chatId);
  const material = await crypto.subtle.digest("SHA-256", textEncoder.encode(`webchat-local-e2ee:${chatId}`));
  const key = await crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
  encryptionKeyCache.set(chatId, key);
  return key;
}

async function encryptChatValue(chatId, value) {
  if (!crypto?.subtle) {
    return {
      cipher: btoa(unescape(encodeURIComponent(String(value || "")))),
      iv: "local-fallback",
      fallback: true
    };
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await chatEncryptionKey(chatId);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(String(value || "")));
  return {
    cipher: arrayBufferToBase64(cipher),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

async function decryptChatValue(chatId, payload) {
  if (!payload?.cipher || !payload?.iv) return "";
  if (payload.fallback || payload.iv === "local-fallback" || !crypto?.subtle) {
    try {
      return decodeURIComponent(escape(atob(payload.cipher)));
    } catch (error) {
      return "[Encrypted message]";
    }
  }
  try {
    const key = await chatEncryptionKey(chatId);
    const plain = await crypto.subtle.decrypt({
      name: "AES-GCM",
      iv: new Uint8Array(base64ToArrayBuffer(payload.iv))
    }, key, base64ToArrayBuffer(payload.cipher));
    return textDecoder.decode(plain);
  } catch (error) {
    console.warn("Message decrypt failed", error);
    return "[Encrypted message]";
  }
}

const conversations = [
  {
    id: "nadia",
    name: "Nadia Rahman",
    status: "Active now",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    time: "9:41 PM",
    unread: 2,
    messages: [
      { from: "them", text: "Kalke class er pore free thakba?", time: "9:31 PM" },
      { from: "me", text: "Haan, 4 tar por free." },
      { from: "them", text: "Tahole assignment ta eksathe finish kori." }
    ]
  },
  {
    id: "rafi",
    name: "Rafi Ahmed",
    status: "Active 12m ago",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    time: "8:18 PM",
    unread: 0,
    messages: [
      { from: "them", text: "Design ta onek clean lagse." },
      { from: "me", text: "Thanks! aro kichu animation add korbo." },
      { from: "them", text: "Nice, dekhar jonno ready." }
    ]
  },
  {
    id: "mitu",
    name: "Mitu Islam",
    status: "Active now",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80",
    time: "7:02 PM",
    unread: 1,
    messages: [
      { from: "them", text: "Photo gulo pathaile album banabo." },
      { from: "me", text: "Ami ekhuni select kortesi." },
      { from: "them", text: "Perfect!" }
    ]
  },
  {
    id: "imran",
    name: "Imran Hossain",
    status: "Active yesterday",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    time: "Tue",
    unread: 0,
    messages: [
      { from: "them", text: "Match ta dekhsos?" },
      { from: "me", text: "Last 10 minute miss hoise." },
      { from: "them", text: "Oi part tai best chilo!" }
    ]
  },
  {
    id: "sadia",
    name: "Sadia Chowdhury",
    status: "Active 1h ago",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    time: "Mon",
    unread: 0,
    messages: [
      { from: "them", text: "Presentation file ta share korchi." },
      { from: "me", text: "Peye gesi, thank you." }
    ]
  }
];

const homeScreen = document.querySelector("#homeScreen");
const chatScreen = document.querySelector("#chatScreen");
const authScreen = document.querySelector("#authScreen");
const authTitle = document.querySelector("#authTitle");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const loginNumber = document.querySelector("#loginNumber");
const loginPassword = document.querySelector("#loginPassword");
const signupName = document.querySelector("#signupName");
const signupNumber = document.querySelector("#signupNumber");
const signupPassword = document.querySelector("#signupPassword");
const signupConfirmPassword = document.querySelector("#signupConfirmPassword");
const signupAdminCode = document.querySelector("#signupAdminCode");
const signupCodePasteButton = document.querySelector("#signupCodePasteButton");
const signupComplete = document.querySelector("#signupComplete");
const signupCompletePhoto = document.querySelector("#signupCompletePhoto");
const signupCompleteName = document.querySelector("#signupCompleteName");
const signupPhotoButton = document.querySelector("#signupPhotoButton");
const signupPhotoInput = document.querySelector("#signupPhotoInput");
const codeNoteButton = document.querySelector("#codeNoteButton");
const authMessage = document.querySelector("#authMessage");
const authSwitchButton = document.querySelector("#authSwitchButton");
const loginSubmitButton = loginForm.querySelector(".auth-submit");
const signupSubmitButton = signupForm.querySelector(".auth-submit");
const chatList = document.querySelector("#chatList");
const messages = document.querySelector("#messages");
const chatName = document.querySelector("#chatName");
const chatStatus = document.querySelector("#chatStatus");
const chatTitle = document.querySelector(".chat-title");
const chatAvatar = document.querySelector("#chatAvatar");
const chatAvatarWrap = document.querySelector("#chatAvatarWrap");
const jumpBottomButton = document.querySelector("#jumpBottomButton");
const jumpBottomCount = document.querySelector("#jumpBottomCount");
const adminUsersButton = document.querySelector("#adminUsersButton");
const adminUsersOverlay = document.querySelector("#adminUsersOverlay");
const adminUsersCloseButton = document.querySelector("#adminUsersCloseButton");
const adminUsersList = document.querySelector("#adminUsersList");
const adminCodesPanel = document.querySelector("#adminCodesPanel");
const generateCodesButton = document.querySelector("#generateCodesButton");
const adminCodesList = document.querySelector("#adminCodesList");
const storyRow = document.querySelector(".story-row");
const homeOptionsButton = document.querySelector("#homeOptionsButton");
const homeOptionsMenu = document.querySelector("#homeOptionsMenu");
const showArchivedButton = document.querySelector("#showArchivedButton");
const showBlockedButton = document.querySelector("#showBlockedButton");
const addUserButton = document.querySelector("#addUserButton");
const fabActions = document.querySelector("#fabActions");
const fabGroupButton = document.querySelector("#fabGroupButton");
const fabFriendButton = document.querySelector("#fabFriendButton");
const userFinderPanel = document.querySelector("#userFinderPanel");
const userSearchNumber = document.querySelector("#userSearchNumber");
const userSearchButton = document.querySelector("#userSearchButton");
const userSearchMessage = document.querySelector("#userSearchMessage");
const userSearchResult = document.querySelector("#userSearchResult");
const chatOptionsButton = document.querySelector("#chatOptionsButton");
const chatOptionsMenu = document.querySelector("#chatOptionsMenu");
const chatAddMemberButton = document.querySelector("#chatAddMemberButton");
const chatGroupRequestsButton = document.querySelector("#chatGroupRequestsButton");
const groupRequestBadge = document.querySelector("#groupRequestBadge");
const muteChatButton = document.querySelector("#muteChatButton");
const clearChatButton = document.querySelector("#clearChatButton");
const backButton = document.querySelector("#backButton");
const messageForm = document.querySelector("#messageForm");
const blockedComposer = document.querySelector("#blockedComposer");
const blockedComposerText = blockedComposer?.querySelector("span");
const blockedComposerUnblock = document.querySelector("#blockedComposerUnblock");
const messageInput = document.querySelector("#messageInput");
const messageInputWrap = document.querySelector(".message-input-wrap");
const inlineComposeActions = document.querySelector(".inline-compose-actions");
const replyPreview = document.querySelector("#replyPreview");
const replyPreviewName = document.querySelector("#replyPreviewName");
const replyPreviewText = document.querySelector("#replyPreviewText");
const replyCancelButton = document.querySelector("#replyCancelButton");
const emojiButton = document.querySelector("#emojiButton");
const emojiMenu = document.querySelector("#emojiMenu");
const attachmentButton = document.querySelector("#attachmentButton");
const attachmentMenu = document.querySelector("#attachmentMenu");
const photoButton = document.querySelector("#photoButton");
const inlinePhotoButton = document.querySelector("#inlinePhotoButton");
const voiceButton = document.querySelector("#voiceButton");
const fileButton = document.querySelector("#fileButton");
const photoInput = document.querySelector("#photoInput");
const fileInput = document.querySelector("#fileInput");
const searchInput = document.querySelector("#searchInput");
const phoneShell = document.querySelector(".phone-shell");
const profileButton = document.querySelector("#profileButton");
const profileOverlay = document.querySelector("#profileOverlay");
const profileBackdrop = document.querySelector("#profileBackdrop");
const profileCloseButton = document.querySelector("#profileCloseButton");
const profilePanel = document.querySelector("#profileOverlay .profile-panel");
const profileEditButton = document.querySelector("#profileEditButton");
const profilePhoto = document.querySelector("#profilePhoto");
const profilePhotoButton = document.querySelector("#profilePhotoButton");
const profilePhotoInput = document.querySelector("#profilePhotoInput");
const profileName = document.querySelector("#profileName");
const profileNameRow = document.querySelector(".profile-name-row");
const profileNameInput = document.querySelector("#profileNameInput");
const profileNameButton = document.querySelector("#profileNameButton");
const profileStatus = document.querySelector("#profileStatus");
const profileBio = document.querySelector("#profileBio");
const profileUsername = document.querySelector("#profileUsername");
const profileNumber = document.querySelector("#profileNumber");
const profileDetails = document.querySelector(".profile-details");
const profileLogoutButton = document.querySelector("#profileLogoutButton");
const profileFriendCount = document.querySelector("#profileFriendCount");
const profileFriendList = document.querySelector("#profileFriendList");
const seeAllFriendsButton = document.querySelector("#seeAllFriendsButton");
const friendsOverlay = document.querySelector("#friendsOverlay");
const allFriendsList = document.querySelector("#allFriendsList");
const friendsCloseButton = document.querySelector("#friendsCloseButton");
const friendProfileOverlay = document.querySelector("#friendProfileOverlay");
const friendProfilePanel = document.querySelector(".friend-profile-panel");
const friendProfileCloseButton = document.querySelector("#friendProfileCloseButton");
const friendProfileEditButton = document.querySelector("#friendProfileEditButton");
const friendPhotoWrap = document.querySelector("#friendPhotoWrap");
const friendProfilePhoto = document.querySelector("#friendProfilePhoto");
const friendProfilePhotoButton = document.querySelector("#friendProfilePhotoButton");
const friendProfileName = document.querySelector("#friendProfileName");
const friendProfileNameInput = document.querySelector("#friendProfileNameInput");
const friendProfileNameButton = document.querySelector("#friendProfileNameButton");
const friendProfileStatus = document.querySelector("#friendProfileStatus");
const friendProfileBio = document.querySelector("#friendProfileBio");
const friendProfileUsername = document.querySelector("#friendProfileUsername");
const friendProfileNumber = document.querySelector("#friendProfileNumber");
const groupMembersSection = document.querySelector("#groupMembersSection");
const groupMembersList = document.querySelector("#groupMembersList");
const groupMembersSeeMoreButton = document.querySelector("#groupMembersSeeMoreButton");
const friendProfileMessageButton = document.querySelector("#friendProfileMessageButton");
const friendProfileBlockButton = document.querySelector("#friendProfileBlockButton");
const friendProfileVerifyButton = document.querySelector("#friendProfileVerifyButton");
const friendProfileRestrictButton = document.querySelector("#friendProfileRestrictButton");
const friendProfilePasswordButton = document.querySelector("#friendProfilePasswordButton");
const friendProfileDeleteButton = document.querySelector("#friendProfileDeleteButton");
const savedOverlay = document.querySelector("#savedOverlay");
const savedTitle = document.querySelector("#savedTitle");
const savedList = document.querySelector("#savedList");
const savedCloseButton = document.querySelector("#savedCloseButton");
const desktopQuery = window.matchMedia("(min-width: 760px)");

let activeGelButton = null;
let gelStartX = 0;
let gelStartY = 0;
let gelMaxDistance = 0;
let suppressGelClickUntil = 0;

let currentConversation = null;
let longPressTimer;
let longPressTriggered = false;
let conversationHoldTimer;
let pendingConversationPress = null;
let lastConversationPointerOpenAt = 0;
let lastConversationOpenId = null;
let suppressConversationClickUntil = 0;
let suppressConversationRenderUntil = 0;
let activeConversationMenu;
let activeConversationMenuAnchor = null;
let activeConfirmDialog = null;
let menuOpenedAt = 0;
let confirmOpenedAt = 0;
let activeProfile = null;
let activeFriendProfile = null;
let activeFriendProfileFromAdmin = false;
let currentUser = null;
let firebaseUser = null;
let unsubscribeChats = null;
let unsubscribeMessages = null;
let unsubscribePresence = null;
let unsubscribeConnection = null;
let unsubscribeUserSession = null;
let currentSessionId = null;
let activeMessageChatId = null;
let activeMessageTimeId = null;
let activePresenceUserId = null;
let seenAllowedChatId = null;
let presenceRefreshTimer = null;
let restoredUiState = false;
let chatHistoryActive = false;
let handlingHistoryPop = false;
let allowBrowserBackExit = false;
let appBackTrapReady = false;
let homeBackPrimed = false;
let homeBackPrimeTimer = null;
let creatingSignupAccount = false;
let resettingPasswordAccount = false;
let pendingSignupProfile = null;
let pendingSignupLogin = null;
let pendingLoginNumber = "";
let notificationStatePrimed = false;
let startOnHomeAfterLogin = false;
let notificationPermissionAsked = false;
let pendingInitialRestoreReveal = false;
let initialRestoreRevealTimer = null;
let voiceRecorder = null;
let voiceChunks = [];
let voiceStream = null;
let voiceStartedAt = 0;
let voicePausedAt = 0;
let voicePausedMs = 0;
let voiceTimer = null;
let pendingVoiceBlob = null;
let pendingVoiceUrl = "";
let voiceDiscarding = false;
let voiceMimeType = "audio/webm";
let voiceAutoSendAfterStop = false;
const memberProfileCache = new Map();
const memberProfileLoadRequests = new Set();
let pendingPhotoFile = null;
let pendingPhotoUrl = "";
let activeReplyMessage = null;
let replySwipeStart = null;
const lastNotificationKeys = new Map();
const presenceStatusCache = new Map();
const listPresenceUnsubscribers = new Map();
const listPresenceTimers = new Map();
const deliveredAckCache = new Map();
let outgoingQueueSyncing = false;
let forceMessagesScrollBottom = false;
let jumpBottomUnread = 0;

const authUsersKey = "webchatUsers";
const authSessionKey = "webchatCurrentUser";
const uiStateKey = "webchatUiState";
const profileCachePrefix = "webchatProfileCache";
const outgoingQueuePrefix = "webchatOutgoingQueue";
const adminLoginAlias = "sihab";
const blankUserAvatar = "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20200%20200%27%3E%3Crect%20width%3D%27200%27%20height%3D%27200%27%20fill%3D%27%23fff%27/%3E%3Ccircle%20cx%3D%27100%27%20cy%3D%2758%27%20r%3D%2741%27%20fill%3D%27%23bdbdbd%27/%3E%3Cpath%20d%3D%27M37%20171c0-47%2025-74%2063-74s63%2027%2063%2074c0%2017-11%2028-28%2028H65c-17%200-28-11-28-28Z%27%20fill%3D%27%23bdbdbd%27/%3E%3C/svg%3E";
const defaultAvatar = blankUserAvatar;
const messageRetentionMs = 30 * 24 * 60 * 60 * 1000;

const myProfile = {
  name: "",
  status: "",
  avatar: defaultAvatar,
  bio: "",
  username: "",
  number: "",
  editable: true
};

const demoUsers = [
  {
    id: "demo-0",
    number: "0",
    password: "0",
    profile: {
      name: "Sihab Ahmed",
      status: "Active now",
      avatar: defaultAvatar,
      bio: "Building a clean chat app",
      username: "@sihab.chat",
      number: "+880 1712-345678",
      editable: true
    }
  },
  {
    id: "demo-1",
    number: "1",
    password: "1",
    profile: {
      name: "Demo User",
      status: "Active now",
      avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=260&q=80",
      bio: "Testing WebChat account",
      username: "@demo.webchat",
      number: "1",
      editable: true
    }
  }
];

function normalizePhoneNumber(number) {
  return String(number || "").trim().replace(/[\s\-()]/g, "");
}

function normalizeBangladeshPhoneNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits === "0") return "0";
  if (/^01\d{9}$/.test(digits)) return digits;
  if (/^1\d{9}$/.test(digits)) return `0${digits}`;
  if (/^8801\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return "";
}

function maxBangladeshPhoneDigits(digits) {
  if (digits.startsWith("880")) return 13;
  if (digits.startsWith("0")) return 11;
  return 13;
}

function filterDigitsByPrefixes(digits, prefixes) {
  let nextDigits = "";
  for (const digit of digits) {
    const candidate = `${nextDigits}${digit}`;
    const allowed = prefixes.some((prefix) => {
      return prefix.startsWith(candidate) || candidate.startsWith(prefix);
    });
    if (allowed) nextDigits = candidate;
  }
  return nextDigits;
}

function hasInvalidBangladeshMobileOperator(digits) {
  if (/^01/.test(digits) && digits.length >= 3) return !/^01[3-9]/.test(digits);
  if (/^8801/.test(digits) && digits.length >= 5) return !/^8801[3-9]/.test(digits);
  return false;
}

function sanitizeAuthNumberInput(value, { allowShortDemo = false } = {}) {
  const rawValue = String(value || "").trim();
  if (allowShortDemo && /^s/i.test(rawValue)) {
    return `${rawValue.charAt(0).toUpperCase()}${rawValue.slice(1)}`;
  }
  const hasCountryPlus = rawValue.startsWith("+");
  const rawDigits = rawValue.replace(/\D/g, "");
  if (allowShortDemo && !hasCountryPlus && /^[01]$/.test(rawDigits)) return rawDigits;
  let digits = "";
  for (const digit of filterDigitsByPrefixes(rawDigits, hasCountryPlus ? ["8801"] : ["01", "8801"])) {
    const candidate = `${digits}${digit}`;
    if (hasInvalidBangladeshMobileOperator(candidate)) continue;
    digits = candidate;
  }
  const maxDigits = maxBangladeshPhoneDigits(digits);
  const nextDigits = digits.slice(0, maxDigits);
  return hasCountryPlus ? `+${nextDigits}` : nextDigits;
}

function enforceAuthNumberLimit(input, options = {}) {
  const previousValue = input.value;
  const nextValue = sanitizeAuthNumberInput(previousValue, options);
  input.value = nextValue;
  if (nextValue === previousValue) return;
  if (options.allowShortDemo && /^s/i.test(previousValue)) return;
  flashAuthInputWarning(input);
  if (previousValue.replace(/\D/g, "").length > nextValue.replace(/\D/g, "").length) {
    setAuthMessage("Use a valid phone number format.");
  }
}

function normalizeAuthNumberField(input, allowShortDemo = false) {
  const rawValue = String(input.value || "").trim();
  if (allowShortDemo && rawValue.toLowerCase() === adminLoginAlias) {
    input.value = "Sihab";
    return "0";
  }
  const normalized = normalizeBangladeshPhoneNumber(rawValue);
  if (normalized) {
    input.value = normalized;
    return normalized;
  }
  const cleanValue = normalizePhoneNumber(rawValue);
  if (allowShortDemo && (cleanValue === "0" || cleanValue === "1")) {
    input.value = cleanValue;
    return cleanValue;
  }
  return "";
}

function isAdminLoginAlias(value) {
  return String(value || "").trim().toLowerCase() === adminLoginAlias;
}

function numberForAccountLookup(input, allowAnyNumber = false) {
  const normalized = normalizeAuthNumberField(input, allowAnyNumber);
  if (normalized) return normalized;
  return "";
}

async function accountExistsForNumber(number) {
  const cleanNumber = normalizePhoneNumber(number);
  if (!cleanNumber) return false;
  const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(cleanNumber)));
  if (numberSnapshot.exists()) return true;
  const usersSnapshot = await getDocs(query(collection(db, "users"), where("number", "==", cleanNumber)));
  return !!usersSnapshot.docs[0];
}

function flashAuthInputWarning(input, persist = false) {
  if (persist) input.classList.add("input-error");
  input.classList.remove("input-warning");
  void input.offsetWidth;
  input.classList.add("input-warning");
  window.setTimeout(() => input.classList.remove("input-warning"), 420);
}

async function warnLoginNumberIfMissing() {
  const adminAlias = isAdminLoginAlias(loginNumber.value);
  const number = numberForAccountLookup(loginNumber, true);
  if (!number) {
    if (loginNumber.value.trim()) {
      setAuthMessage("Enter a valid phone number.");
      flashAuthInputWarning(loginNumber, true);
      return true;
    }
    return false;
  }
  if (number === "0" && !adminAlias) {
    setAuthMessage("No account found with this number.");
    flashAuthInputWarning(loginNumber, true);
    return true;
  }
  if (number === "0" || number === "1") return false;
  try {
    if (await accountExistsForNumber(number)) return false;
    setAuthMessage("No account found with this number.");
    flashAuthInputWarning(loginNumber, true);
    return true;
  } catch (error) {
    console.warn("Login number check failed", error);
    return false;
  }
}

async function warnSignupNumberIfExists() {
  const number = numberForAccountLookup(signupNumber, true);
  if (!number) {
    if (signupNumber.value.trim()) {
      setAuthMessage("Enter a valid phone number.");
      flashAuthInputWarning(signupNumber, true);
      return true;
    }
    return false;
  }
  try {
    if (!(await accountExistsForNumber(number))) return false;
    setAuthMessage("This number is already registered.");
    flashAuthInputWarning(signupNumber, true);
    return true;
  } catch (error) {
    console.warn("Signup number check failed", error);
    return false;
  }
}

function warnSignupPasswordMismatch() {
  if (!signupConfirmPassword.value) return false;
  if (signupPassword.value === signupConfirmPassword.value) {
    if (authMessage.textContent === "Passwords do not match.") setAuthMessage("");
    signupConfirmPassword.classList.remove("input-warning");
    signupConfirmPassword.classList.remove("input-error");
    return false;
  }
  setAuthMessage("Passwords do not match.");
  flashAuthInputWarning(signupConfirmPassword, true);
  return true;
}

function warnSignupPasswordTooShort() {
  if (!signupPassword.value) return false;
  if (signupPassword.value.length >= 6) {
    if (authMessage.textContent === "Password must be at least 6 characters.") setAuthMessage("");
    signupPassword.classList.remove("input-warning");
    signupPassword.classList.remove("input-error");
    return false;
  }
  setAuthMessage("Password must be at least 6 characters.");
  flashAuthInputWarning(signupPassword, true);
  return true;
}

function sanitizeUserSearchValue(value) {
  const raw = String(value || "").trim();
  if (raw.startsWith("@")) {
    return `@${raw.slice(1).toLowerCase().replace(/[^a-z0-9_.]/g, "")}`;
  }
  return raw.replace(/\D/g, "");
}

function numberToEmail(number) {
  return `${normalizePhoneNumber(number)}@webchat.local`;
}

function numberToReusableEmail(number) {
  const cleanNumber = numberDocId(number).replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${cleanNumber}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@webchat.local`;
}

async function authEmailForNumber(number) {
  const cleanNumber = normalizePhoneNumber(number);
  const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(cleanNumber)));
  if (numberSnapshot.exists()) {
    return numberSnapshot.data().authEmail || numberSnapshot.data().email || numberToEmail(cleanNumber);
  }

  const usersSnapshot = await getDocs(query(collection(db, "users"), where("number", "==", cleanNumber)));
  const userDoc = usersSnapshot.docs[0];
  if (userDoc) {
    const userData = userDoc.data();
    const authEmail = userData.authEmail || userData.email || numberToEmail(cleanNumber);
    await setDoc(doc(db, "numbers", numberDocId(cleanNumber)), {
      uid: userDoc.id,
      number: cleanNumber,
      authEmail,
      email: authEmail
    }, { merge: true }).catch(() => {});
    return authEmail;
  }

  return numberToEmail(cleanNumber);
}

function normalizeSignupCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

function generateSignupCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let index = 0; index < 10; index += 1) {
    raw += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `WC-${raw.slice(0, 5)}-${raw.slice(5)}`;
}

function authPassword(password) {
  const value = String(password);
  return value.length >= 6 ? value : `${value}webchat`;
}

function numberDocId(number) {
  return normalizePhoneNumber(number).replaceAll("/", "_");
}

function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function groupId() {
  return `group_${firebaseUser?.uid || "local"}_${Date.now()}`;
}

function currentClockTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function normalizeUserDoc(uid, data) {
  return {
    id: uid,
    uid,
    number: data.number,
    profile: {
      name: data.name || "WebChat User",
      status: data.status || "Offline",
      avatar: data.avatar || defaultAvatar,
      bio: data.bio || "",
      username: data.username || `@${data.number}.webchat`,
      number: data.number || "",
      restricted: !!data.restricted,
      verified: !!data.verified || data.number === "0",
      editable: true
    }
  };
}

function profilePayload(profile = myProfile) {
  return {
    name: profile.name,
    avatar: profile.avatar,
    bio: profile.bio,
    username: profile.username,
    number: profile.number,
    verified: !!profile.verified,
    restricted: !!profile.restricted
  };
}

function userToConversation(user, chatId = null, chatData = {}) {
  const profile = user.profile || normalizeUserDoc(user.uid || user.id, user).profile;
  return {
    id: chatId || `account-${user.uid || user.id}`,
    chatId,
    userId: user.uid || user.id,
    name: profile.name,
    status: profile.status || "Offline",
    avatar: profile.avatar,
    time: chatData.time || "Now",
    unread: 0,
    bio: profile.bio,
    username: profile.username,
    number: profile.number || user.number,
    restricted: !!profile.restricted,
    verified: !!profile.verified,
    muted: false,
    messages: [],
    remote: true
  };
}

function groupToConversation(chatId, data = {}) {
  const name = data.groupName || data.name || "New group";
  const participants = Array.isArray(data.participants) ? data.participants : [];
  const admins = Array.isArray(data.admins) && data.admins.length ? data.admins : [data.adminId].filter(Boolean);
  return {
    id: chatId,
    chatId,
    isGroup: true,
    adminId: data.adminId || "",
    admins,
    participants,
    memberIds: participants,
    pendingAddRequests: Array.isArray(data.pendingAddRequests) ? data.pendingAddRequests : [],
    userId: "",
    name,
    status: `${Math.max(participants.length, 1)} members`,
    avatar: data.avatar || defaultAvatar,
    time: data.lastTime || "Now",
    unread: 0,
    bio: data.bio || "Group chat",
    username: data.username || "@group.webchat",
    number: "",
    restricted: false,
    verified: false,
    muted: false,
    messages: [],
    remote: true
  };
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(authUsersKey)) || [];
  } catch (error) {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(authUsersKey, JSON.stringify(users));
}

function uiStorageKey() {
  return firebaseUser ? `${uiStateKey}:${firebaseUser.uid}` : uiStateKey;
}

function profileCacheKey(uid) {
  return `${profileCachePrefix}:${uid}`;
}

function readCachedUserProfile(uid) {
  if (!uid) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(profileCacheKey(uid)));
    if (!cached?.profile) return null;
    return normalizeUserDoc(uid, {
      uid,
      number: cached.number || cached.profile.number || "",
      ...cached.profile
    });
  } catch (error) {
    return null;
  }
}

function writeCachedUserProfile(user) {
  if (!user?.uid && !user?.id) return;
  try {
    localStorage.setItem(profileCacheKey(user.uid || user.id), JSON.stringify({
      uid: user.uid || user.id,
      number: user.number || user.profile?.number || "",
      profile: {
        ...(user.profile || {}),
        editable: true
      },
      savedAt: Date.now()
    }));
  } catch (error) {
    console.warn("Profile cache full", error);
  }
}

function saveUiState(state) {
  if (!firebaseUser) return;
  localStorage.setItem(uiStorageKey(), JSON.stringify({
    ...state,
    savedAt: Date.now()
  }));
}

function readUiState() {
  if (!firebaseUser) return null;

  try {
    return JSON.parse(localStorage.getItem(uiStorageKey()));
  } catch (error) {
    return null;
  }
}

function revealAppAfterInitialRestore() {
  pendingInitialRestoreReveal = false;
  window.clearTimeout(initialRestoreRevealTimer);
  initialRestoreRevealTimer = null;
  phoneShell.classList.remove("auth-pending");
}

function updateChatEmptyState() {
  chatScreen.classList.toggle("empty-chat", !currentConversation);
}

function findConversationForState(state) {
  return conversations.find((conversation) => {
    return conversation.id === state.conversationId
      || conversation.chatId === state.chatId
      || conversation.userId === state.userId
      || conversation.number === state.number;
  });
}

function restoreUiState() {
  if (restoredUiState || !firebaseUser) return;
  restoredUiState = true;

  const state = readUiState();
  if (!state?.view || state.view === "home") {
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "chat") {
    const conversation = findConversationForState(state);
    if (conversation) openConversation(conversation.id, true);
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "profile") {
    openProfile(myProfile);
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "friends") {
    openProfile(myProfile);
    openAllFriends();
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "friendProfile") {
    const conversation = findConversationForState(state);
    if (conversation) openFriendProfile(conversation);
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "saved") {
    openSavedView(state.type || "archived");
    revealAppAfterInitialRestore();
    return;
  }

  if (state.view === "adminUsers" && isAdminAccount()) {
    openAdminUsers();
  }
  revealAppAfterInitialRestore();
}

function seedAuthUsers() {
  const users = readUsers();
  let changed = false;

  demoUsers.forEach((demoUser) => {
    const exists = users.some((user) => user.number === demoUser.number);
    if (!exists) {
      users.push(demoUser);
      changed = true;
    }
  });

  if (changed) writeUsers(users);
}

function createProfile(name, number) {
  const cleanName = name.trim();
  const username = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "user";

  return {
    name: cleanName,
    status: "Active now",
    avatar: defaultAvatar,
    bio: "",
    username: `@${username}.webchat`,
    number,
    verified: number === "0",
    editable: true
  };
}

function setAuthMessage(message, isSuccess = false, showReset = false) {
  authMessage.textContent = "";
  authMessage.classList.toggle("success", isSuccess);
  if (showReset) {
    const text = document.createElement("span");
    text.textContent = message ? `${message} ` : "Wrong password ";
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "forgot-password-link";
    resetButton.textContent = "Forgot password?";
    resetButton.addEventListener("click", openPasswordResetDialog);
    authMessage.append(text, resetButton);
    return;
  }
  authMessage.textContent = message;
}

function createPasswordField(input) {
  const wrap = document.createElement("span");
  wrap.className = "password-wrap";
  const toggle = document.createElement("button");
  toggle.className = "password-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Show password");
  wrap.append(input, toggle);
  setupPasswordToggles(wrap);
  return wrap;
}

const passwordEyePaths = {
  hidden: "M2.1 12.68a1 1 0 0 1 0-1.36C4.52 8.58 7.94 6 12 6c4.06 0 7.48 2.58 9.9 5.32a1 1 0 0 1 0 1.36C19.48 15.42 16.06 18 12 18c-4.06 0-7.48-2.58-9.9-5.32ZM12 16c2.9 0 5.54-1.64 7.77-4C17.54 9.64 14.9 8 12 8s-5.54 1.64-7.77 4C6.46 14.36 9.1 16 12 16Zm0-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  visible: "M3.7 2.3a1 1 0 0 0-1.4 1.4l3.08 3.08A14.78 14.78 0 0 0 2.1 11.32a1 1 0 0 0 0 1.36C4.52 15.42 7.94 18 12 18c1.5 0 2.9-.35 4.18-.94l4.12 4.14a1 1 0 0 0 1.4-1.4l-18-17.5ZM12 16c-2.9 0-5.54-1.64-7.77-4a12.63 12.63 0 0 1 2.6-3.76l1.6 1.6A4 4 0 0 0 14.16 15.57l.5.5c-.84.3-1.72.43-2.66.43Zm7.77-4a13.14 13.14 0 0 1-2.14 2.18l1.42 1.42a15.06 15.06 0 0 0 2.85-2.92 1 1 0 0 0 0-1.36C19.48 8.58 16.06 6 12 6c-.78 0-1.53.09-2.25.26l1.7 1.7c.18-.01.36-.02.55-.02 2.9 0 5.54 1.64 7.77 4.06Z"
};

function setPasswordToggleIcon(toggle, showing) {
  toggle.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", showing ? passwordEyePaths.hidden : passwordEyePaths.visible);
  svg.appendChild(path);
  toggle.appendChild(svg);
  toggle.classList.toggle("showing", showing);
  toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
}

function setupPasswordToggles(root = document) {
  root.querySelectorAll(".password-toggle").forEach((toggle) => {
    if (toggle.dataset.ready === "true") return;
    toggle.dataset.ready = "true";
    setPasswordToggleIcon(toggle, false);
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const wrap = toggle.closest(".password-wrap");
      const input = wrap?.querySelector("input");
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      setPasswordToggleIcon(toggle, !showing);
      input.focus();
    });
  });
}

async function pasteSignupCode() {
  try {
    const text = await navigator.clipboard.readText();
    signupAdminCode.value = normalizeSignupCode(text);
    signupAdminCode.focus();
  } catch (error) {
    window.alert("Clipboard theke paste kora jay nai. Browser permission check koro.");
  }
}

async function reserveAdminCode(adminCode, number) {
  await db.runTransaction(async (transaction) => {
    const codeRef = doc(db, "signupCodes", adminCode);
    const codeSnapshot = await transaction.get(codeRef);
    if (!codeSnapshot.exists) {
      throw new Error("invalid-code");
    }
    const codeData = codeSnapshot.data();
    if (codeData.used) {
      throw new Error("used-code");
    }
    transaction.update(codeRef, {
      used: true,
      usedAt: firestoreServerTimestamp(),
      usedByNumber: number,
      useType: "signup"
    });
  });
}

function showVerificationCodeNote() {
  const phoneNumber = "01747219338";
  if (activeConfirmDialog) activeConfirmDialog.remove();
  closeConversationMenu();
  confirmOpenedAt = Date.now();

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active verification-note-overlay";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog verification-note-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "verification-note-heading";

  const heading = document.createElement("h3");
  heading.textContent = "Verification code";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy";

  const text = document.createElement("p");
  text.append(
    document.createTextNode("To receive your verification code, please call "),
    Object.assign(document.createElement("span"), {
      className: "confirm-highlight",
      textContent: phoneNumber
    }),
    document.createTextNode(". You will get the code via an automated voice call.")
  );

  const close = () => {
    overlay.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
  };

  dialog.addEventListener("click", (event) => event.stopPropagation());
  copyButton.addEventListener("click", async () => {
    const copied = await copyText(phoneNumber);
    copyButton.textContent = copied ? "Copied" : "Copy failed";
    window.setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1400);
  });
  overlay.addEventListener("click", close);

  header.append(heading, copyButton);
  dialog.append(header, text);
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  activeConfirmDialog = overlay;
  copyButton.focus();
}

function showResetVerificationCodeNote(phoneNumber = "01747219338") {
  document.querySelector(".reset-note-overlay")?.remove();
  confirmOpenedAt = Date.now();

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active verification-note-overlay reset-note-overlay";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog verification-note-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "verification-note-heading";

  const heading = document.createElement("h3");
  heading.textContent = "Verification code";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy";

  const text = document.createElement("p");
  text.append(
    document.createTextNode("To receive your verification code, please call "),
    Object.assign(document.createElement("span"), {
      className: "confirm-highlight",
      textContent: phoneNumber
    }),
    document.createTextNode(". You will get the code via an automated voice call.")
  );

  const close = () => overlay.remove();
  dialog.addEventListener("click", (event) => event.stopPropagation());
  copyButton.addEventListener("click", async () => {
    const copied = await copyText(phoneNumber);
    copyButton.textContent = copied ? "Copied" : "Copy failed";
    window.setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1400);
  });
  overlay.addEventListener("click", close);

  header.append(heading, copyButton);
  dialog.append(header, text);
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  copyButton.focus();
}

function createResetField(labelText, input) {
  const label = document.createElement("label");
  label.className = "floating-reset-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  const fieldInput = input.matches?.("input") ? input : input.querySelector?.("input");
  if (fieldInput) fieldInput.placeholder = " ";
  label.append(span, input);
  return label;
}

function openPasswordResetDialog() {
  if (activeConfirmDialog) activeConfirmDialog.remove();
  closeConversationMenu();
  confirmOpenedAt = Date.now();

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog password-reset-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Forget password";

  const newPassword = document.createElement("input");
  newPassword.type = "password";
  newPassword.placeholder = "New password";
  newPassword.autocomplete = "new-password";

  const confirmPassword = document.createElement("input");
  confirmPassword.type = "password";
  confirmPassword.placeholder = "Confirm password";
  confirmPassword.autocomplete = "new-password";

  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.placeholder = "Verification code";
  codeInput.autocomplete = "one-time-code";
  const supportNumber = "01747219338";

  const codeLabel = document.createElement("label");
  codeLabel.className = "floating-reset-field";
  const labelRow = document.createElement("span");
  labelRow.textContent = "Admin verification code";
  const codeWrap = document.createElement("span");
  codeWrap.className = "paste-wrap reset-code-wrap";
  const noteButton = document.createElement("button");
  noteButton.type = "button";
  noteButton.className = "code-note-button";
  noteButton.textContent = "!";
  noteButton.setAttribute("aria-label", "Verification code note");
  codeWrap.append(codeInput, noteButton);
  codeInput.placeholder = " ";
  codeLabel.append(labelRow, codeWrap);

  const notePanel = document.createElement("div");
  notePanel.className = "reset-code-note";
  notePanel.hidden = true;
  const noteText = document.createElement("p");
  noteText.append(
    document.createTextNode("To receive your verification code, please call "),
    Object.assign(document.createElement("span"), { className: "confirm-highlight", textContent: supportNumber }),
    document.createTextNode(". You will get the code via an automated voice call.")
  );
  const noteCopy = document.createElement("button");
  noteCopy.type = "button";
  noteCopy.textContent = "Copy";
  noteCopy.addEventListener("click", async () => {
    const copied = await copyText(supportNumber);
    noteCopy.textContent = copied ? "Copied" : "Copy failed";
    window.setTimeout(() => {
      noteCopy.textContent = "Copy";
    }, 1400);
  });
  notePanel.append(noteText, noteCopy);
  noteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showResetVerificationCodeNote(supportNumber);
  });

  const message = document.createElement("p");
  message.className = "reset-message";

  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";

  const close = () => {
    overlay.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
  };
  const warnResetPasswordTooShort = () => {
    if (!newPassword.value) return false;
    if (newPassword.value.length >= 6) {
      if (message.textContent === "Password must be at least 6 characters.") message.textContent = "";
      newPassword.classList.remove("input-error", "input-warning");
      return false;
    }
    message.textContent = "Password must be at least 6 characters.";
    flashAuthInputWarning(newPassword, true);
    return true;
  };
  const warnResetPasswordMismatch = () => {
    if (!confirmPassword.value) return false;
    if (newPassword.value === confirmPassword.value) {
      if (message.textContent === "Passwords do not match.") message.textContent = "";
      confirmPassword.classList.remove("input-error", "input-warning");
      return false;
    }
    message.textContent = "Passwords do not match.";
    flashAuthInputWarning(confirmPassword, true);
    return true;
  };

  cancelButton.addEventListener("click", close);
  newPassword.addEventListener("input", () => {
    newPassword.classList.remove("input-error");
    if (message.textContent === "Password must be at least 6 characters.") message.textContent = "";
  });
  newPassword.addEventListener("blur", warnResetPasswordTooShort);
  confirmPassword.addEventListener("focus", warnResetPasswordTooShort);
  confirmPassword.addEventListener("pointerdown", warnResetPasswordTooShort);
  confirmPassword.addEventListener("input", () => {
    confirmPassword.classList.remove("input-error");
    if (message.textContent === "Passwords do not match.") message.textContent = "";
  });
  confirmPassword.addEventListener("blur", warnResetPasswordMismatch);
  codeInput.addEventListener("focus", () => {
    warnResetPasswordTooShort();
    warnResetPasswordMismatch();
  });
  codeInput.addEventListener("pointerdown", () => {
    warnResetPasswordTooShort();
    warnResetPasswordMismatch();
  });
  resetButton.addEventListener("click", async () => {
    resetButton.disabled = true;
    message.classList.remove("success");
    message.textContent = "";
    if (warnResetPasswordTooShort() || warnResetPasswordMismatch()) {
      resetButton.disabled = false;
      return;
    }
    try {
      await resetPasswordWithAdminCode({
        number: normalizePhoneNumber(loginNumber.value),
        password: newPassword.value,
        confirmPassword: confirmPassword.value,
        adminCode: normalizeSignupCode(codeInput.value)
      });
      close();
    } catch (error) {
      if (error.message === "invalid-code") message.textContent = "Invalid admin verification code.";
      else if (error.message === "used-code") message.textContent = "This admin code is already used or expired.";
      else message.textContent = error.message || "Password reset could not be completed.";
      resetButton.disabled = false;
    }
  });

  actions.append(cancelButton, resetButton);
  dialog.append(
    heading,
    createResetField("New password", createPasswordField(newPassword)),
    createResetField("Confirm password", createPasswordField(confirmPassword)),
    codeLabel,
    message,
    actions
  );
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  activeConfirmDialog = overlay;
  newPassword.focus();
}

function openProfilePasswordDialog() {
  if (!currentUser) return;
  if (activeConfirmDialog) activeConfirmDialog.remove();
  closeConversationMenu();
  confirmOpenedAt = Date.now();

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog password-reset-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Change password";

  const currentInput = document.createElement("input");
  currentInput.type = "password";
  currentInput.placeholder = "Current password";
  currentInput.autocomplete = "current-password";

  const newInput = document.createElement("input");
  newInput.type = "password";
  newInput.placeholder = "New password";
  newInput.autocomplete = "new-password";

  const confirmInput = document.createElement("input");
  confirmInput.type = "password";
  confirmInput.placeholder = "Confirm password";
  confirmInput.autocomplete = "new-password";

  const forgotButton = document.createElement("button");
  forgotButton.type = "button";
  forgotButton.className = "forgot-password-link password-dialog-forgot";
  forgotButton.textContent = "Forgot password?";

  const message = document.createElement("p");
  message.className = "reset-message";

  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";

  const close = () => {
    overlay.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
  };

  cancelButton.addEventListener("click", close);
  forgotButton.addEventListener("click", () => {
    close();
    if (!loginNumber.value.trim()) loginNumber.value = myProfile.number || currentUser.number || "";
    openPasswordResetDialog();
  });
  const warnNewPasswordTooShort = () => {
    if (!newInput.value) return false;
    if (newInput.value.length >= 6) {
      if (message.textContent === "Password must be at least 6 characters.") message.textContent = "";
      newInput.classList.remove("input-error", "input-warning");
      return false;
    }
    message.textContent = "Password must be at least 6 characters.";
    flashAuthInputWarning(newInput, true);
    return true;
  };
  const warnConfirmPasswordMismatch = () => {
    if (!confirmInput.value) return false;
    if (newInput.value === confirmInput.value) {
      if (message.textContent === "Passwords do not match.") message.textContent = "";
      confirmInput.classList.remove("input-error", "input-warning");
      return false;
    }
    message.textContent = "Passwords do not match.";
    flashAuthInputWarning(confirmInput, true);
    return true;
  };
  newInput.addEventListener("input", () => {
    newInput.classList.remove("input-error");
    if (message.textContent === "Password must be at least 6 characters.") message.textContent = "";
  });
  newInput.addEventListener("blur", warnNewPasswordTooShort);
  newInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    confirmInput.focus();
    warnNewPasswordTooShort();
  });
  confirmInput.addEventListener("focus", warnNewPasswordTooShort);
  confirmInput.addEventListener("pointerdown", warnNewPasswordTooShort);
  confirmInput.addEventListener("input", () => {
    confirmInput.classList.remove("input-error");
    if (message.textContent === "Passwords do not match.") message.textContent = "";
  });
  confirmInput.addEventListener("blur", warnConfirmPasswordMismatch);
  confirmInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    warnConfirmPasswordMismatch();
  });
  saveButton.addEventListener("click", async () => {
    message.textContent = "";
    if (!currentInput.value || !newInput.value || !confirmInput.value) {
      message.textContent = "Wrong your current password.";
      flashAuthInputWarning(currentInput, true);
      return;
    }
    if (newInput.value.length < 6) {
      warnNewPasswordTooShort();
      return;
    }
    if (newInput.value !== confirmInput.value) {
      message.textContent = "Passwords do not match.";
      flashAuthInputWarning(confirmInput, true);
      return;
    }

    saveButton.disabled = true;
    try {
      if (firebaseUser) {
        await reauthenticateWithPassword(firebaseUser, authPassword(currentInput.value));
        await updatePassword(firebaseUser, authPassword(newInput.value));
      }
      close();
      window.alert("Password changed");
    } catch (error) {
      message.textContent = "Current password is incorrect. Sign in again if needed.";
      saveButton.disabled = false;
    }
  });

  actions.append(cancelButton, saveButton);
  dialog.append(
    heading,
    createResetField("Current password", createPasswordField(currentInput)),
    createResetField("New password", createPasswordField(newInput)),
    createResetField("Confirm password", createPasswordField(confirmInput)),
    forgotButton,
    message,
    actions
  );
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  activeConfirmDialog = overlay;
  currentInput.focus();
}

async function updateSignupPhoto() {
  const file = signupPhotoInput.files?.[0];
  if (!file || !pendingSignupProfile?.uid) return;
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    const url = reader.result;
    pendingSignupProfile.avatar = url;
    setImageAfterLoad(signupCompletePhoto, url, pendingSignupProfile.name || "Profile");
    await updateDoc(doc(db, "users", pendingSignupProfile.uid), {
      "profile.avatar": url,
      updatedAt: firestoreServerTimestamp()
    }).catch(() => {
      window.alert("Photo update hoy nai. Firebase rules check koro.");
    });
    signupPhotoInput.value = "";
  });
  reader.readAsDataURL(file);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }
  input.remove();
  return copied;
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(520, audioContext.currentTime + 0.14);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);
    window.setTimeout(() => audioContext.close(), 350);
  } catch (error) {
  }
}

function showInAppNotification(conversation) {
  document.querySelector(".notification-toast")?.remove();
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "notification-toast";
  const avatar = document.createElement("img");
  avatar.src = conversation.avatar;
  avatar.alt = "";
  const text = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = conversation.name;
  const message = document.createElement("small");
  message.textContent = latestMessage(conversation) || "New message";
  text.append(name, message);
  toast.append(avatar, text);
  toast.addEventListener("click", () => {
    toast.remove();
    openConversation(conversation.id);
  });
  phoneShell.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

async function requestSystemNotificationPermission() {
  if (notificationPermissionAsked || !("Notification" in window)) return;
  notificationPermissionAsked = true;
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch (error) {
  }
}

async function notifyIncomingMessage(conversation) {
  if (!conversation || conversation.muted) return;
  playNotificationSound();

  if (!("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      await requestSystemNotificationPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(conversation.name, {
        body: latestMessage(conversation) || "New message",
        icon: conversation.avatar
      });
    }
  } catch (error) {
  }
}

function createVerifiedBadge() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("verified-badge");
  svg.setAttribute("viewBox", "0 0 40 40");
  svg.setAttribute("aria-label", "Verified");
  svg.setAttribute("role", "img");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z");
  svg.appendChild(path);
  return svg;
}

function setVerifiedName(element, name, verified = false) {
  element.textContent = "";
  element.appendChild(document.createTextNode(name));
  if (verified) element.appendChild(createVerifiedBadge());
}

function setImageAfterLoad(image, src, alt = "") {
  if (!image) return;
  const nextSrc = src || defaultAvatar;
  image.alt = alt;
  image.classList.add("image-loading");
  image.onload = () => {
    image.classList.remove("image-loading");
  };
  image.onerror = () => {
    if (nextSrc !== defaultAvatar) {
      setImageAfterLoad(image, defaultAvatar, alt);
      return;
    }
    image.classList.remove("image-loading");
  };
  image.removeAttribute("src");
  image.src = nextSrc;
  if (image.complete && image.naturalWidth) image.classList.remove("image-loading");
}

function setAuthLoading(button, isLoading) {
  button.classList.toggle("loading", isLoading);
  button.disabled = isLoading;
}

function showAuthMode(mode) {
  const isSignup = mode === "signup";
  loginForm.classList.toggle("active", !isSignup);
  signupForm.classList.toggle("active", isSignup);
  signupComplete.classList.remove("active");
  signupComplete.setAttribute("aria-hidden", "true");
  authMessage.classList.remove("hidden");
  authTitle.textContent = isSignup ? "Create account" : "Login";
  authTitle.classList.add("hidden");
  authSwitchButton.textContent = isSignup ? "Already have an account" : "Create new account";
  setAuthMessage("");
  if (mode === "login") {
    pendingSignupProfile = null;
    pendingSignupLogin = null;
  }
}

function showSignupComplete(profile) {
  pendingSignupProfile = profile;
  loginForm.classList.remove("active");
  signupForm.classList.remove("active");
  signupComplete.classList.add("active");
  signupComplete.setAttribute("aria-hidden", "false");
  authTitle.classList.add("hidden");
  authSwitchButton.textContent = "Login";
  setImageAfterLoad(signupCompletePhoto, profile.avatar, profile.name || "Profile");
  signupCompleteName.textContent = profile.name;
  setAuthMessage("");
  authMessage.classList.add("hidden");
}

function applyUserProfile(user) {
  currentUser = user;
  Object.assign(myProfile, user.profile, { editable: true });
  writeCachedUserProfile(user);
  setImageAfterLoad(profileButton.querySelector("img"), myProfile.avatar, myProfile.name || "Profile");
}

function persistCurrentUserProfile() {
  if (!currentUser || !firebaseUser) return;
  currentUser.profile = { ...myProfile, editable: true };
  writeCachedUserProfile(currentUser);
  updateDoc(doc(db, "users", firebaseUser.uid), {
    ...profilePayload(myProfile),
    updatedAt: firestoreServerTimestamp()
  });
}

async function createUserProfileDocument(userCredential, number, name, authEmail = userCredential.user.email) {
  const cleanNumber = normalizePhoneNumber(number);
  const profile = createProfile(name, cleanNumber);
  const uid = userCredential.user.uid;
  const payload = {
    uid,
    email: authEmail,
    authEmail,
    ...profilePayload(profile),
    number: cleanNumber,
    createdAt: firestoreServerTimestamp(),
    updatedAt: firestoreServerTimestamp()
  };

  await db.runTransaction(async (transaction) => {
    const numberRef = doc(db, "numbers", numberDocId(cleanNumber));
    const userRef = doc(db, "users", uid);
    const numberSnapshot = await transaction.get(numberRef);
    if (numberSnapshot.exists && numberSnapshot.data()?.uid !== uid) {
      throw new Error("number-exists");
    }
    transaction.set(userRef, payload, { merge: true });
    transaction.set(numberRef, { uid, number: cleanNumber, authEmail, email: authEmail });
  });
  return normalizeUserDoc(uid, payload);
}

async function loadUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return normalizeUserDoc(uid, snapshot.data());
}

async function migrateUserIdentity(oldUid, newUid) {
  if (!oldUid || !newUid || oldUid === newUid) return;
  await signalUserDeletion(oldUid);
  const chatsSnapshot = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", oldUid)));
  await Promise.all(chatsSnapshot.docs.map(async (chatDoc) => {
    const chatData = chatDoc.data();
    const participants = (chatData.participants || []).map((uid) => uid === oldUid ? newUid : uid);
    const messagesSnapshot = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    await Promise.all(messagesSnapshot.docs.map((messageDoc) => {
      const data = messageDoc.data();
      const update = {};
      if (data.senderId === oldUid) update.senderId = newUid;
      if (data.receiverId === oldUid) update.receiverId = newUid;
      return Object.keys(update).length
        ? updateDoc(doc(db, "chats", chatDoc.id, "messages", messageDoc.id), update)
        : Promise.resolve();
    }));
    await setDoc(doc(db, "chats", chatDoc.id), {
      participants,
      updatedAt: firestoreServerTimestamp()
    }, { merge: true });
  }));
  await deleteDoc(doc(db, "users", oldUid)).catch(() => {});
}

async function createAuthAccountWithoutSwitching(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password: authPassword(password),
      returnSecureToken: false
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Auth account could not be created.");
  }
  return {
    uid: data.localId,
    email
  };
}

async function changeUserPasswordAsAdmin(user, password, confirmPassword) {
  if (!isAdminAccount()) throw new Error("Admin access is required.");
  if (!user?.uid || !user.number) throw new Error("User not found.");
  if (!password || !confirmPassword) throw new Error("Enter the new password and confirmation.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");

  const number = normalizePhoneNumber(user.number);
  const oldUid = user.uid;
  const oldProfileSnapshot = await getDoc(doc(db, "users", oldUid));
  const oldProfile = oldProfileSnapshot.exists()
    ? normalizeUserDoc(oldUid, oldProfileSnapshot.data()).profile
    : user.profile || createProfile(user.profile?.name || number, number);
  const authEmail = numberToReusableEmail(number);
  const credential = await createAuthAccountWithoutSwitching(authEmail, password);
  const newUid = credential.uid;

  await setDoc(doc(db, "users", newUid), {
    uid: newUid,
    number,
    email: authEmail,
    authEmail,
    ...profilePayload({ ...oldProfile, number }),
    createdAt: oldProfileSnapshot.data?.()?.createdAt || firestoreServerTimestamp(),
    updatedAt: firestoreServerTimestamp()
  }, { merge: true });
  await setDoc(doc(db, "numbers", numberDocId(number)), { uid: newUid, number, authEmail, email: authEmail }, { merge: true });
  await migrateUserIdentity(oldUid, newUid);

  conversations.forEach((conversation) => {
    if (conversation.userId !== oldUid) return;
    conversation.userId = newUid;
    conversation.number = number;
  });
  if (activeFriendProfile?.userId === oldUid) {
    activeFriendProfile.userId = newUid;
    activeFriendProfile.number = number;
  }
}

async function resetPasswordWithAdminCode({ number, password, confirmPassword, adminCode }) {
  number = normalizePhoneNumber(number);
  if (!number) throw new Error("Enter your phone number.");
  if (!password || !confirmPassword || !adminCode) throw new Error("Enter the new password, confirmation, and admin code.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");

  const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(number)));
  if (!numberSnapshot.exists()) throw new Error("No account found with this number.");
  const numberData = numberSnapshot.data();
  const oldUid = numberData.uid;
  const oldProfileSnapshot = oldUid ? await getDoc(doc(db, "users", oldUid)) : null;
  const oldProfile = oldProfileSnapshot?.exists() ? normalizeUserDoc(oldUid, oldProfileSnapshot.data()).profile : createProfile(number, number);

  let codeReserved = false;
  let credential = null;
  try {
    await reserveAdminCode(adminCode, number);
    codeReserved = true;
    resettingPasswordAccount = true;
    const authEmail = numberToReusableEmail(number);
    credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword(password));
    const newUid = credential.user.uid;
    await setDoc(doc(db, "users", newUid), {
      uid: newUid,
      number,
      email: authEmail,
      authEmail,
      ...profilePayload({ ...oldProfile, number }),
      createdAt: oldProfileSnapshot?.data?.()?.createdAt || firestoreServerTimestamp(),
      updatedAt: firestoreServerTimestamp()
    }, { merge: true });
    await setDoc(doc(db, "numbers", numberDocId(number)), { uid: newUid, number, authEmail, email: authEmail }, { merge: true });
    await migrateUserIdentity(oldUid, newUid);
    await setDoc(doc(db, "signupCodes", adminCode), {
      usedByUid: newUid,
      useType: "passwordForget"
    }, { merge: true });
    resettingPasswordAccount = false;
    firebaseUser = credential.user;
    const profile = await loadUserProfile(newUid);
    await setupSingleUserSession(newUid);
    completeLogin(profile);
    setupPresence(newUid);
  } catch (error) {
    resettingPasswordAccount = false;
    if (codeReserved && !credential) {
      await setDoc(doc(db, "signupCodes", adminCode), {
        used: false,
        usedAt: null,
        usedByNumber: ""
      }, { merge: true }).catch(() => {});
    }
    throw error;
  }
}

function completeLogin(user) {
  const manualLogin = loginSubmitButton.classList.contains("loading");
  setAuthLoading(loginSubmitButton, false);
  setAuthLoading(signupSubmitButton, false);
  ensureAppBackTrap();
  startOnHomeAfterLogin = manualLogin;
  restoredUiState = manualLogin;
  applyUserProfile(user);
  if (manualLogin) {
    localStorage.removeItem(uiStorageKey());
    saveUiState({ view: "home" });
  }
  adminUsersButton.classList.toggle("active", isAdminAccount(user));
  authScreen.classList.remove("active");
  authScreen.setAttribute("aria-hidden", "true");
  const savedState = manualLogin ? null : readUiState();
  const shouldDelayInitialReveal = !!savedState?.view && savedState.view !== "home";
  pendingInitialRestoreReveal = shouldDelayInitialReveal;
  window.clearTimeout(initialRestoreRevealTimer);
  initialRestoreRevealTimer = null;
  if (shouldDelayInitialReveal) {
    phoneShell.classList.add("auth-pending");
    initialRestoreRevealTimer = window.setTimeout(revealAppAfterInitialRestore, 3500);
  } else {
    revealAppAfterInitialRestore();
  }
  homeScreen.classList.add("active");
  chatScreen.classList.remove("active");
  phoneShell.classList.remove("chat-open");
  seenAllowedChatId = null;
  conversations.length = 0;
  currentConversation = null;
  subscribeToMyChats();
  updateChatEmptyState();
  renderConversations(searchInput.value);
  messages.innerHTML = "";
}

function refreshLoggedInProfile(user) {
  applyUserProfile(user);
  adminUsersButton.classList.toggle("active", isAdminAccount(user));
  if (profileOverlay.classList.contains("active")) openProfile(myProfile);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!["http:", "https:"].includes(window.location.protocol)) return;
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Offline app cache register failed", error);
  });
}

function createSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function clearCurrentUserSession(uid) {
  if (!uid || !currentSessionId) return;
  const sessionRef = ref(realtimeDb, `activeSessions/${uid}`);

  try {
    const snapshot = await sessionRef.once("value");
    if (snapshot.val()?.sessionId === currentSessionId) {
      await set(sessionRef, null);
    }
  } catch (error) {
    console.warn("Session clear failed", error);
  }
}

async function forceLogoutForNewLogin(message = "This account was signed in on another device.") {
  const oldSessionId = currentSessionId;
  if (unsubscribeUserSession) unsubscribeUserSession();
  unsubscribeUserSession = null;
  currentSessionId = null;
  resetSessionView(true);
  setAuthMessage(message);

  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Auto logout failed", error);
    if (oldSessionId) currentSessionId = null;
  }
}

async function setupSingleUserSession(uid) {
  if (unsubscribeUserSession) unsubscribeUserSession();
  currentSessionId = createSessionId();
  const sessionRef = ref(realtimeDb, `activeSessions/${uid}`);

  await set(sessionRef, {
    sessionId: currentSessionId,
    updatedAt: databaseServerTimestamp()
  });

  unsubscribeUserSession = onValue(sessionRef, (snapshot) => {
    const session = snapshot.val();
    if (!session?.sessionId || session.sessionId === currentSessionId) return;
    forceLogoutForNewLogin(session.deleted ? "This account has been deleted." : undefined);
  });
}

function resetSessionView(showLogin = false) {
  setAuthLoading(loginSubmitButton, false);
  setAuthLoading(signupSubmitButton, false);
  if (unsubscribeChats) unsubscribeChats();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePresence) unsubscribePresence();
  if (unsubscribeConnection) unsubscribeConnection();
  if (unsubscribeUserSession) unsubscribeUserSession();
  window.clearTimeout(presenceRefreshTimer);
  clearListPresenceSubscriptions();
  presenceStatusCache.clear();
  lastNotificationKeys.clear();
  notificationStatePrimed = false;
  pendingInitialRestoreReveal = false;
  window.clearTimeout(initialRestoreRevealTimer);
  initialRestoreRevealTimer = null;
  unsubscribeChats = null;
  unsubscribeMessages = null;
  unsubscribePresence = null;
  unsubscribeConnection = null;
  unsubscribeUserSession = null;
  presenceRefreshTimer = null;
  currentSessionId = null;
  activeMessageChatId = null;
  activePresenceUserId = null;
  seenAllowedChatId = null;
  restoredUiState = false;
  chatHistoryActive = false;
  handlingHistoryPop = false;
  allowBrowserBackExit = false;
  appBackTrapReady = false;
  homeBackPrimed = false;
  window.clearTimeout(homeBackPrimeTimer);
  homeBackPrimeTimer = null;
  currentUser = null;
  firebaseUser = null;
  Object.assign(myProfile, {
    name: "",
    status: "",
    avatar: defaultAvatar,
    bio: "",
    username: "",
    number: "",
    editable: true
  });
  pendingLoginNumber = "";
  currentConversation = null;
  startOnHomeAfterLogin = false;
  conversations.length = 0;
  setImageAfterLoad(profileButton.querySelector("img"), defaultAvatar, "Profile");
  closeHomeOptions();
  closeChatOptions();
  closeAttachmentMenu();
  closeEmojiMenu();
  closeMessageActions();
  closeConversationMenu();
  profileOverlay.classList.remove("active");
  profileOverlay.setAttribute("aria-hidden", "true");
  friendProfileOverlay.classList.remove("active");
  friendProfileOverlay.setAttribute("aria-hidden", "true");
  friendsOverlay.classList.remove("active");
  friendsOverlay.setAttribute("aria-hidden", "true");
  savedOverlay.classList.remove("active");
  savedOverlay.setAttribute("aria-hidden", "true");
  adminUsersOverlay.classList.remove("active");
  adminUsersOverlay.setAttribute("aria-hidden", "true");
  adminUsersButton.classList.remove("active");
  renderConversations();
  messages.innerHTML = "";
  chatName.textContent = "";
  chatStatus.textContent = "";
  chatAvatar.removeAttribute("src");
  chatAvatar.alt = "";
  chatAvatarWrap.classList.remove("active", "offline");
  updateChatEmptyState();

  if (showLogin) {
    phoneShell.classList.remove("auth-pending");
    authScreen.classList.add("active");
    authScreen.setAttribute("aria-hidden", "false");
    showAuthMode("login");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  requestSystemNotificationPermission();
  setAuthLoading(loginSubmitButton, true);
  const adminAlias = isAdminLoginAlias(loginNumber.value);
  const number = numberForAccountLookup(loginNumber, true);
  const password = loginPassword.value;

  if (!number || !password) {
    setAuthMessage("Enter your number and password.");
    if (!number) flashAuthInputWarning(loginNumber, true);
    setAuthLoading(loginSubmitButton, false);
    return;
  }

  if (number === "0" && !adminAlias) {
    setAuthMessage("No account found with this number.");
    flashAuthInputWarning(loginNumber, true);
    setAuthLoading(loginSubmitButton, false);
    return;
  }

  try {
    pendingLoginNumber = number;
    await signInWithEmailAndPassword(auth, await authEmailForNumber(number), authPassword(password));
  } catch (error) {
    const isDemo = (number === "0" && adminAlias && password === "0") || (number === "1" && password === "1");
    if (!isDemo) {
      setAuthMessage("Wrong password", false, true);
      setAuthLoading(loginSubmitButton, false);
      return;
    }

    try {
      const demo = demoUsers.find((item) => item.number === number);
      const authEmail = number === "0" ? numberToReusableEmail(number) : numberToEmail(number);
      pendingLoginNumber = number;
      const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword(password));
      await createUserProfileDocument(credential, number, demo.profile.name, authEmail);
    } catch (createError) {
      if (number === "0" && createError.code === "auth/email-already-in-use") {
        try {
          const authEmail = numberToReusableEmail(number);
          pendingLoginNumber = number;
          const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword(password));
          await createUserProfileDocument(credential, number, "Sihab Ahmed", authEmail);
          return;
        } catch (recreateError) {
          console.warn("Admin recreate failed", recreateError);
        }
      }
      setAuthMessage(number === "0" ? "Admin account could not be prepared. Check Firebase rules." : "Demo account is not ready. Please try again.");
      setAuthLoading(loginSubmitButton, false);
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  requestSystemNotificationPermission();
  setAuthLoading(signupSubmitButton, true);
  const name = signupName.value.trim();
  const number = normalizeAuthNumberField(signupNumber);
  const password = signupPassword.value;
  const confirmPassword = signupConfirmPassword.value;
  const adminCode = normalizeSignupCode(signupAdminCode.value);

  if (!name) {
    setAuthMessage("Enter your name.");
    flashAuthInputWarning(signupName, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (!number) {
    setAuthMessage("Enter a valid phone number.");
    flashAuthInputWarning(signupNumber, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (!password) {
    setAuthMessage("Enter a password.");
    flashAuthInputWarning(signupPassword, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (!confirmPassword) {
    setAuthMessage("Confirm your password.");
    flashAuthInputWarning(signupConfirmPassword, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (!adminCode) {
    setAuthMessage("Enter the admin verification code.");
    flashAuthInputWarning(signupAdminCode, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.");
    flashAuthInputWarning(signupPassword, true);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage("Passwords do not match.");
    flashAuthInputWarning(signupConfirmPassword);
    setAuthLoading(signupSubmitButton, false);
    return;
  }

  let codeReserved = false;
  try {
    if (await accountExistsForNumber(number)) {
      setAuthMessage("This number is already registered.");
      flashAuthInputWarning(signupNumber, true);
      setAuthLoading(signupSubmitButton, false);
      return;
    }

    await reserveAdminCode(adminCode, number);
    codeReserved = true;

    creatingSignupAccount = true;
    const authEmail = numberToReusableEmail(number);
    const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword(password));
    const profile = await createUserProfileDocument(credential, number, name, authEmail);
    await setDoc(doc(db, "signupCodes", adminCode), {
      usedByUid: credential.user.uid,
      useType: "signup"
    }, { merge: true });
    setAuthLoading(signupSubmitButton, false);
    pendingSignupLogin = { number, password };
    showSignupComplete({ uid: credential.user.uid, number, name: profile.name, avatar: profile.avatar });
    await signOut(auth);
    signupPassword.value = "";
    signupConfirmPassword.value = "";
    signupAdminCode.value = "";
  } catch (error) {
    if (codeReserved) {
      await setDoc(doc(db, "signupCodes", adminCode), {
        used: false,
        usedAt: null,
        usedByNumber: ""
      }, { merge: true }).catch(() => {});
    }
    if (error.message === "invalid-code") {
      setAuthMessage("Invalid admin verification code.");
    } else if (error.message === "used-code") {
      setAuthMessage("This admin code is already used or expired.");
    } else if (error.message === "number-exists") {
      setAuthMessage("This number is already registered.");
    } else {
      setAuthMessage(error.code === "auth/email-already-in-use" ? "This number is already registered." : "Signup could not be completed.");
    }
    setAuthLoading(signupSubmitButton, false);
  } finally {
    creatingSignupAccount = false;
  }
}

async function logout() {
  const uid = firebaseUser?.uid;
  profileLogoutButton.classList.add("loading");
  profileLogoutButton.disabled = true;
  try {
    await clearCurrentUserSession(uid);
    if (uid) {
      await set(ref(realtimeDb, `status/${uid}`), {
        state: "offline",
        lastChanged: databaseServerTimestamp()
      });
    }
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  } finally {
    profileLogoutButton.classList.remove("loading");
    profileLogoutButton.disabled = false;
    resetSessionView(true);
    loginNumber.value = "";
    loginPassword.value = "";
    loginNumber.classList.remove("input-error", "input-warning");
    loginNumber.focus();
  }
}

function initializeAuth() {
  onAuthStateChanged(auth, async (authUser) => {
    if (creatingSignupAccount || resettingPasswordAccount) return;
    if (!authUser) {
      if (pendingSignupProfile) {
        phoneShell.classList.remove("auth-pending");
        authScreen.classList.add("active");
        authScreen.setAttribute("aria-hidden", "false");
        showSignupComplete(pendingSignupProfile);
      } else {
        resetSessionView(true);
      }
      return;
    }

    const keepLoginSpinner = loginSubmitButton.classList.contains("loading");
    const loginNumberForRecovery = pendingLoginNumber;
    resetSessionView(false);
    pendingLoginNumber = loginNumberForRecovery;
    if (keepLoginSpinner) setAuthLoading(loginSubmitButton, true);
    phoneShell.classList.add("auth-pending");
    firebaseUser = authUser;
    const cachedProfile = readCachedUserProfile(authUser.uid);
    if (cachedProfile) {
      completeLogin(cachedProfile);
    }
    let profile = await loadUserProfile(authUser.uid);
    if (!profile && pendingLoginNumber === "0") {
      profile = await createUserProfileDocument({ user: authUser }, "0", "Sihab Ahmed", authUser.email || numberToEmail("0")).catch(() => null);
    }
    if (!profile) {
      phoneShell.classList.remove("auth-pending");
      await signOut(auth);
      authScreen.classList.add("active");
      authScreen.setAttribute("aria-hidden", "false");
      showAuthMode("login");
      setAuthMessage("Wrong password", false, true);
      return;
    }
    await setupSingleUserSession(authUser.uid);
    if (cachedProfile) {
      refreshLoggedInProfile(profile);
    } else {
      completeLogin(profile);
    }
    pendingLoginNumber = "";
    setupPresence(authUser.uid);
    flushOutgoingQueue();
  });
}

function setupPresence(uid) {
  if (unsubscribeConnection) unsubscribeConnection();
  const connectedRef = ref(realtimeDb, ".info/connected");
  const statusRef = ref(realtimeDb, `status/${uid}`);

  unsubscribeConnection = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() !== true) return;
    onDisconnect(statusRef).set({
      state: "offline",
      lastChanged: databaseServerTimestamp()
    });
    set(statusRef, {
      state: "online",
      lastChanged: databaseServerTimestamp()
    });
  });
}

function applyPresenceStatus(userId, nextStatus) {
  const previousStatus = presenceStatusCache.get(userId);
  let changed = previousStatus !== nextStatus;
  presenceStatusCache.set(userId, nextStatus);
  conversations.forEach((item) => {
    if (item.userId !== userId || item.status === nextStatus) return;
    item.status = nextStatus;
    changed = true;
  });
  if (currentConversation?.userId === userId && currentConversation.status !== nextStatus) {
    currentConversation.status = nextStatus;
    renderMessages();
  }
  if (changed) renderConversations(searchInput.value);
}

function schedulePresenceRefresh(userId, value) {
  window.clearTimeout(presenceRefreshTimer);
  presenceRefreshTimer = null;
  if (value?.state !== "offline") return;
  const lastChanged = typeof value?.lastChanged === "number" ? value.lastChanged : 0;
  if (!lastChanged) return;
  const remaining = 10000 - Math.max(0, Date.now() - lastChanged);
  const delay = Math.max(0, remaining) + 100;
  presenceRefreshTimer = window.setTimeout(async () => {
    if (activePresenceUserId !== userId) return;
    try {
      const statusSnapshot = await ref(realtimeDb, `status/${userId}`).get();
      const latestValue = statusSnapshot.val();
      if (activePresenceUserId !== userId) return;
      applyPresenceStatus(userId, formatPresenceStatus(latestValue, true));
      schedulePresenceRefresh(userId, latestValue);
    } catch (error) {
      applyPresenceStatus(userId, formatPresenceStatus(value, true));
    }
  }, delay);
}

function scheduleListPresenceRefresh(userId, value) {
  window.clearTimeout(listPresenceTimers.get(userId));
  listPresenceTimers.delete(userId);
  if (value?.state !== "offline") return;
  const lastChanged = typeof value?.lastChanged === "number" ? value.lastChanged : 0;
  if (!lastChanged) return;
  const remaining = 10000 - Math.max(0, Date.now() - lastChanged);
  const delay = Math.max(0, remaining) + 100;
  const timer = window.setTimeout(async () => {
    try {
      const statusSnapshot = await ref(realtimeDb, `status/${userId}`).get();
      const latestValue = statusSnapshot.val();
      applyPresenceStatus(userId, formatPresenceStatus(latestValue, true));
      scheduleListPresenceRefresh(userId, latestValue);
    } catch (error) {
      applyPresenceStatus(userId, formatPresenceStatus(value, true));
    }
  }, delay);
  listPresenceTimers.set(userId, timer);
}

function clearListPresenceSubscriptions() {
  listPresenceUnsubscribers.forEach((unsubscribe) => unsubscribe());
  listPresenceUnsubscribers.clear();
  listPresenceTimers.forEach((timer) => window.clearTimeout(timer));
  listPresenceTimers.clear();
}

function syncListPresenceSubscriptions(rows) {
  const nextUserIds = new Set(rows.filter((row) => !row.isGroup).map((row) => row.userId).filter(Boolean));
  listPresenceUnsubscribers.forEach((unsubscribe, userId) => {
    if (nextUserIds.has(userId)) return;
    unsubscribe();
    listPresenceUnsubscribers.delete(userId);
    window.clearTimeout(listPresenceTimers.get(userId));
    listPresenceTimers.delete(userId);
  });
  nextUserIds.forEach((userId) => {
    if (listPresenceUnsubscribers.has(userId)) return;
    const unsubscribe = onValue(ref(realtimeDb, `status/${userId}`), (snapshot) => {
      const value = snapshot.val();
      applyPresenceStatus(userId, formatPresenceStatus(value));
      scheduleListPresenceRefresh(userId, value);
    });
    listPresenceUnsubscribers.set(userId, unsubscribe);
  });
}

async function getPresenceStatusForUser(userId, fallback = "Offline") {
  if (!userId) return fallback;
  const cached = presenceStatusCache.get(userId);
  if (cached) return cached;
  try {
    const statusSnapshot = await ref(realtimeDb, `status/${userId}`).get();
    const nextStatus = formatPresenceStatus(statusSnapshot.val());
    presenceStatusCache.set(userId, nextStatus);
    return nextStatus;
  } catch (error) {
    return fallback;
  }
}

async function subscribeToMyChats() {
  if (!firebaseUser) return;
  if (unsubscribeChats) unsubscribeChats();

  const ownerUid = firebaseUser.uid;
  const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", ownerUid));
  unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
    const hiddenLocal = readHiddenConversations(ownerUid);
    const rows = await Promise.all(snapshot.docs.map(async (chatDoc) => {
      const data = chatDoc.data();
      if (data.hiddenBy?.[ownerUid]) return null;
      if (data.type === "group") {
        const updatedAt = Math.max(data.updatedAt?.toMillis?.() || 0, localConversationOrder.get(chatDoc.id) || 0);
        const localMessages = readLocalMessages(ownerUid, chatDoc.id);
        const localLast = localMessages.at(-1);
        const remoteLastMessage = data.hiddenLastBy?.[ownerUid]?.text || data.lastMessage || "";
        const remoteLastSender = data.hiddenLastBy?.[ownerUid]?.senderId ?? data.lastSenderId ?? "";
        const isOpenChat = currentConversation?.chatId === chatDoc.id;
        const hiddenAt = hiddenLocal[chatDoc.id] || 0;
        if (hiddenAt && (remoteLastSender === ownerUid || !updatedAt || updatedAt <= hiddenAt)) return null;
        if (hiddenAt && remoteLastSender !== ownerUid && updatedAt > hiddenAt) showConversationLocally(ownerUid, chatDoc.id);
        return {
          ...groupToConversation(chatDoc.id, data),
          messages: localMessages,
          messagesLoaded: !!localMessages.length,
          lastMessage: localLast?.text || remoteLastMessage,
          lastSenderId: remoteLastSender,
          seenBy: data.seenBy || {},
          deliveredBy: data.deliveredBy || {},
          reactionsByMessage: data.reactionsByMessage || {},
          archived: !!data.archivedBy?.[ownerUid],
          blockedBy: data.blockedBy || {},
          blockedByMe: !!data.blockedBy?.[ownerUid],
          blockedByThem: false,
          blocked: !!data.blockedBy?.[ownerUid],
          pinned: !!data.pinnedBy?.[ownerUid],
          pinnedAt: data.pinnedAtBy?.[ownerUid] || 0,
          unread: isOpenChat ? 0 : data.unreadBy?.[ownerUid] || 0,
          muted: !!data.mutedBy?.[ownerUid],
          updatedAt
        };
      }
      const otherUid = data.participants.find((uid) => uid !== ownerUid);
      const userSnapshot = await getDoc(doc(db, "users", otherUid));
      if (!userSnapshot.exists()) return null;
      const otherUser = normalizeUserDoc(otherUid, userSnapshot.data());
      const updatedAt = Math.max(data.updatedAt?.toMillis?.() || 0, localConversationOrder.get(chatDoc.id) || 0);
      const localMessages = readLocalMessages(ownerUid, chatDoc.id);
      const localLast = localMessages.at(-1);
      const remoteLastMessage = data.hiddenLastBy?.[ownerUid]?.text || data.lastMessage || "";
      const remoteLastSender = data.hiddenLastBy?.[ownerUid]?.senderId ?? data.lastSenderId ?? "";
      const isOpenChat = currentConversation?.chatId === chatDoc.id;
      if (!localLast && !remoteLastMessage) return null;
      const hiddenAt = hiddenLocal[chatDoc.id] || 0;
      if (hiddenAt && (remoteLastSender === ownerUid || !updatedAt || updatedAt <= hiddenAt)) return null;
      if (hiddenAt && remoteLastSender !== ownerUid && updatedAt > hiddenAt) showConversationLocally(ownerUid, chatDoc.id);
      const cachedStatus = await getPresenceStatusForUser(
        otherUid,
        conversations.find((item) => item.userId === otherUid)?.status || otherUser.profile.status
      );
      otherUser.profile.status = cachedStatus;
      return {
        ...userToConversation(otherUser, chatDoc.id, {
          time: data.hiddenLastBy?.[ownerUid]?.time || data.lastTime || "Now"
        }),
        messages: localMessages,
        messagesLoaded: !!localMessages.length,
        lastMessage: localLast?.text || remoteLastMessage,
        lastSenderId: remoteLastSender,
        seenBy: data.seenBy || {},
        deliveredBy: data.deliveredBy || {},
        reactionsByMessage: data.reactionsByMessage || {},
        archived: !!data.archivedBy?.[ownerUid],
        blockedBy: data.blockedBy || {},
        blockedByMe: !!data.blockedBy?.[ownerUid],
        blockedByThem: !!data.blockedBy?.[otherUid],
        blocked: !!data.blockedBy?.[ownerUid] || !!data.blockedBy?.[otherUid],
        pinned: !!data.pinnedBy?.[ownerUid],
        pinnedAt: data.pinnedAtBy?.[ownerUid] || 0,
        unread: isOpenChat ? 0 : data.unreadBy?.[ownerUid] || 0,
        muted: !!data.mutedBy?.[ownerUid],
        restricted: !!otherUser.profile.restricted,
        updatedAt
      };
    }));

    if (firebaseUser?.uid !== ownerUid) return;
    const visibleRows = rows.filter(Boolean);
    syncListPresenceSubscriptions(visibleRows);
    visibleRows.forEach((row) => {
      acknowledgeConversationDelivered(row, ownerUid);
      const key = `${row.lastSenderId || ""}|${row.lastMessage || ""}`;
      const previousKey = lastNotificationKeys.get(row.chatId);
      if (notificationStatePrimed && previousKey && previousKey !== key && row.lastSenderId && row.lastSenderId !== ownerUid) {
        notifyIncomingMessage(row);
      }
      lastNotificationKeys.set(row.chatId, key);
    });
    notificationStatePrimed = true;

    conversations.length = 0;
    visibleRows.forEach((row) => conversations.push(row));
    consumeVisibleOutgoingRows(visibleRows).forEach((row) => conversations.push(row));
    sortConversations();
    if (currentConversation?.pendingRemoteChat && !conversations.some((item) => item.id === currentConversation.id)) {
      conversations.unshift(currentConversation);
    }
    if (!currentConversation || !conversations.some((item) => item.id === currentConversation.id)) {
      currentConversation = null;
    } else {
      const updatedCurrent = conversations.find((item) => item.id === currentConversation.id);
      if (updatedCurrent) {
        Object.assign(currentConversation, {
          seenBy: updatedCurrent.seenBy || currentConversation.seenBy,
          deliveredBy: updatedCurrent.deliveredBy || currentConversation.deliveredBy,
          blockedBy: updatedCurrent.blockedBy || currentConversation.blockedBy || {},
          blockedByMe: !!updatedCurrent.blockedByMe,
          blockedByThem: !!updatedCurrent.blockedByThem,
          blocked: !!updatedCurrent.blocked,
          muted: !!updatedCurrent.muted,
          unread: 0,
          lastMessage: currentConversation.lastMessage || updatedCurrent.lastMessage,
          lastSenderId: currentConversation.lastSenderId || updatedCurrent.lastSenderId,
          name: updatedCurrent.name || currentConversation.name,
          status: updatedCurrent.status || currentConversation.status,
          isGroup: !!updatedCurrent.isGroup,
          adminId: updatedCurrent.adminId || currentConversation.adminId,
          admins: updatedCurrent.admins || currentConversation.admins,
          participants: updatedCurrent.participants || currentConversation.participants,
          memberIds: updatedCurrent.memberIds || currentConversation.memberIds,
          reactionsByMessage: updatedCurrent.reactionsByMessage || currentConversation.reactionsByMessage || {}
        });
        applySeenState(currentConversation);
        applyDeliveryState(currentConversation);
        applyConversationReactions(currentConversation);
        if (currentConversation.messagesLoaded) renderMessages();
      }
    }
    if (!currentConversation) {
    messages.innerHTML = "";
    chatName.textContent = "";
    chatStatus.textContent = "";
    chatAvatar.removeAttribute("src");
    chatAvatar.alt = "";
    chatAvatarWrap.classList.remove("active", "offline");
    updateJumpBottomButton();
  }
    updateChatEmptyState();
    renderConversations(searchInput.value);
    restoreUiState();
  });
}

function subscribeToMessages(conversation) {
  if (unsubscribeMessages) unsubscribeMessages();
  activeMessageChatId = conversation?.chatId || null;
  if (!conversation?.chatId) return;

  const chatId = conversation.chatId;
  const ownerUid = firebaseUser?.uid;
  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
    if (activeMessageChatId !== chatId || currentConversation?.chatId !== chatId || firebaseUser?.uid !== ownerUid) return;
    const wasAwayFromBottom = !isMessagesNearBottom(140);
    const previousIncomingIds = new Set((conversation.messages || [])
      .filter((message) => message.from === "them")
      .map((message) => message.id));
    const hiddenIds = new Set();
    const remoteMessages = (await Promise.all(snapshot.docs
      .map(async (messageDoc, index) => {
        const data = messageDoc.data();
        if (data.hiddenFor?.[ownerUid]) {
          hiddenIds.add(messageDoc.id);
          return null;
        }
        return normalizeMessageDoc(messageDoc, ownerUid, index, chatId);
      })))
      .filter(Boolean);

    conversation.messages = pendingLocalClears.has(localMessagesKey(ownerUid, chatId))
      ? []
      : mergeLocalMessages(ownerUid, chatId, remoteMessages, hiddenIds);
    const newIncomingCount = conversation.messages.filter((message) => {
      return message.from === "them" && !previousIncomingIds.has(message.id);
    }).length;
    if (wasAwayFromBottom && newIncomingCount) jumpBottomUnread += newIncomingCount;
    applySeenState(conversation);
    applyDeliveryState(conversation);
    applyConversationReactions(conversation);
    writeLocalMessages(ownerUid, chatId, conversation.messages);
    conversation.messagesLoaded = true;
    cleanupCachedRemoteMessages(chatId, remoteMessages).catch((error) => console.warn("Encrypted remote cleanup failed", error));
    deleteExpiredMessages(chatId, snapshot.docs);
    renderMessages();
    renderConversations(searchInput.value);
    window.setTimeout(() => markConversationSeen(conversation), 0);
  });
}

const pendingLocalClears = new Set();

function localMessagesKey(uid, chatId) {
  return `webchatLocalMessages:${uid}:${chatId}`;
}

function outgoingQueueKey(uid) {
  return `${outgoingQueuePrefix}:${uid}`;
}

function readOutgoingQueue(uid = firebaseUser?.uid) {
  if (!uid) return [];
  try {
    const value = localStorage.getItem(outgoingQueueKey(uid));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeOutgoingQueue(queue, uid = firebaseUser?.uid) {
  if (!uid) return;
  try {
    localStorage.setItem(outgoingQueueKey(uid), JSON.stringify(queue || []));
  } catch (error) {
    console.warn("Outgoing queue cache full", error);
  }
}

function queueOutgoingMessage(conversation, message, messageData, lastMessage, hadChat) {
  if (!firebaseUser || !conversation?.chatId || !message?.id) return;
  const queue = readOutgoingQueue(firebaseUser.uid).filter((item) => item.localMessageId !== message.id);
  queue.push({
    queueId: `${message.id}-${Date.now()}`,
    localMessageId: message.id,
    chatId: conversation.chatId,
    userId: conversation.userId,
    lastMessage,
    hadChat,
    conversation: {
      id: conversation.id,
      chatId: conversation.chatId,
      userId: conversation.userId,
      name: conversation.name,
      avatar: conversation.avatar,
      number: conversation.number,
      status: conversation.status,
      verified: !!conversation.verified
    },
    messageData: {
      ...messageData,
      createdAt: null
    }
  });
  writeOutgoingQueue(queue, firebaseUser.uid);
}

function isOfflineSendError(error) {
  if (!navigator.onLine) return true;
  const code = String(error?.code || error?.message || "").toLowerCase();
  return code.includes("unavailable") || code.includes("network") || code.includes("offline");
}

function findOrCreateQueuedConversation(item) {
  let conversation = conversations.find((row) => row.chatId === item.chatId || row.userId === item.userId);
  if (conversation) return conversation;
  conversation = {
    ...(item.conversation || {}),
    id: item.chatId || item.conversation?.id,
    chatId: item.chatId,
    userId: item.userId,
    messages: readLocalMessages(firebaseUser.uid, item.chatId),
    messagesLoaded: true,
    remote: true
  };
  conversations.push(conversation);
  return conversation;
}

async function flushOutgoingQueue() {
  if (outgoingQueueSyncing || !firebaseUser || !navigator.onLine) return;
  const uid = firebaseUser.uid;
  let queue = readOutgoingQueue(uid);
  if (!queue.length) return;
  outgoingQueueSyncing = true;

  try {
    for (const item of [...queue]) {
      const conversation = findOrCreateQueuedConversation(item);
      conversation.messages = readLocalMessages(uid, item.chatId);
      const localMessage = conversation.messages.find((message) => message.id === item.localMessageId);
      if (!localMessage) {
        queue = queue.filter((queued) => queued.queueId !== item.queueId);
        writeOutgoingQueue(queue, uid);
        continue;
      }

      const messageId = await saveOutgoingRemoteMessage(conversation, {
        ...item.messageData,
        createdAt: firestoreServerTimestamp()
      }, item.lastMessage, item.hadChat);
      removeLocalMessage(uid, item.chatId, localMessage.clientId || item.localMessageId);
      localMessage.id = messageId;
      localMessage.status = "sent";
      applyDeliveryState(conversation);
      writeLocalMessages(uid, item.chatId, conversation.messages);
      queue = queue.filter((queued) => queued.queueId !== item.queueId);
      writeOutgoingQueue(queue, uid);
      if (currentConversation?.chatId === item.chatId) {
        currentConversation.messages = conversation.messages;
        renderMessages();
      }
      renderConversations(searchInput.value);
    }
  } catch (error) {
    console.warn("Outgoing queue sync paused", error);
  } finally {
    outgoingQueueSyncing = false;
  }
}

function hiddenConversationsKey(uid) {
  return `webchatHiddenConversations:${uid}`;
}

function readHiddenConversations(uid) {
  if (!uid) return {};
  try {
    const value = localStorage.getItem(hiddenConversationsKey(uid));
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeHiddenConversations(uid, value) {
  if (!uid) return;
  try {
    localStorage.setItem(hiddenConversationsKey(uid), JSON.stringify(value || {}));
  } catch (error) {
    console.warn("Hidden conversation cache full", error);
  }
}

function hideConversationLocally(uid, chatId) {
  if (!uid || !chatId) return;
  const hidden = readHiddenConversations(uid);
  hidden[chatId] = Date.now();
  writeHiddenConversations(uid, hidden);
}

function showConversationLocally(uid, chatId) {
  if (!uid || !chatId) return;
  const hidden = readHiddenConversations(uid);
  if (!hidden[chatId]) return;
  delete hidden[chatId];
  writeHiddenConversations(uid, hidden);
}

async function normalizeMessageDoc(messageDoc, ownerUid, index = 0, chatId = "") {
  const data = messageDoc.data();
  const createdAtMs = data.createdAt?.toMillis?.() || data.localCreatedAtMs || 0;
  const fromMe = data.senderId === ownerUid;
  const encrypted = !!data.encrypted;
  const text = encrypted ? await decryptChatValue(chatId, data.textCipher) : data.text;
  const url = encrypted && data.urlCipher ? await decryptChatValue(chatId, data.urlCipher) : data.url || "";
  const fileName = encrypted && data.fileNameCipher ? await decryptChatValue(chatId, data.fileNameCipher) : data.fileName || "";
  return {
    id: messageDoc.id,
    from: fromMe ? "me" : "them",
    senderId: data.senderId,
    senderName: data.senderName || "",
    senderAvatar: data.senderAvatar || "",
    receiverId: data.receiverId,
    clientId: data.clientId || "",
    encrypted,
    text,
    type: data.type || "text",
    url,
    fileName,
    time: data.time || "Now",
    date: data.date || "Today",
    status: data.status || "sent",
    replyTo: data.replyTo || null,
    reaction: data.reaction || "",
    createdAtMs,
    localOrder: createdAtMs || index
  };
}

function readLocalMessages(uid, chatId) {
  if (!uid || !chatId) return [];
  try {
    const value = localStorage.getItem(localMessagesKey(uid, chatId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function hydrateConversationFromLocalCache(conversation, uid = firebaseUser?.uid) {
  if (!uid || !conversation?.chatId || conversation.messagesLoaded) return false;
  const cachedMessages = readLocalMessages(uid, conversation.chatId);
  if (!cachedMessages.length) return false;
  conversation.messages = cachedMessages;
  conversation.messagesLoaded = true;
  applySeenState(conversation);
  applyDeliveryState(conversation);
  applyConversationReactions(conversation);
  return true;
}

function writeLocalMessages(uid, chatId, messagesList) {
  if (!uid || !chatId) return;
  const unique = [];
  const seen = new Set();
  messagesList.forEach((message, index) => {
    if (!message?.id || seen.has(message.id)) return;
    seen.add(message.id);
    unique.push({
      ...message,
      localOrder: message.createdAtMs || message.localOrder || index
    });
  });
  unique.sort((a, b) => (a.createdAtMs || a.localOrder || 0) - (b.createdAtMs || b.localOrder || 0));
  try {
    localStorage.setItem(localMessagesKey(uid, chatId), JSON.stringify(unique));
  } catch (error) {
    console.warn("Local message cache full", error);
  }
}

function mergeLocalMessages(uid, chatId, remoteMessages, hiddenIds = new Set()) {
  const merged = new Map();
  const localClientIds = new Map();
  readLocalMessages(uid, chatId).forEach((message, index) => {
    if (!message?.id || hiddenIds.has(message.id)) return;
    const normalized = {
      ...message,
      localOrder: message.createdAtMs || message.localOrder || index
    };
    merged.set(message.id, normalized);
    if (message.clientId) localClientIds.set(message.clientId, message.id);
  });
  remoteMessages.forEach((message, index) => {
    if (!message?.id || hiddenIds.has(message.id)) return;
    const localId = message.clientId ? localClientIds.get(message.clientId) : "";
    const existing = merged.get(message.id) || (localId ? merged.get(localId) : null);
    if (localId && localId !== message.id) merged.delete(localId);
    merged.set(message.id, {
      ...existing,
      ...message,
      createdAtMs: message.createdAtMs || existing?.createdAtMs || existing?.localOrder || message.localOrder || index,
      localOrder: message.createdAtMs || existing?.createdAtMs || existing?.localOrder || message.localOrder || index
    });
  });
  const messagesList = [...merged.values()].sort((a, b) => {
    return (a.createdAtMs || a.localOrder || 0) - (b.createdAtMs || b.localOrder || 0);
  });
  writeLocalMessages(uid, chatId, messagesList);
  return messagesList;
}

function applySeenState(conversation) {
  if (!conversation || !firebaseUser) return;
  if (conversation.isGroup) {
    conversation.messages.forEach((message) => {
      if (message.from !== "me") return;
      const messageTime = message.createdAtMs || message.localOrder || 0;
      const seenMemberIds = Object.entries(conversation.seenBy || {})
        .filter(([uid, seenAt]) => uid !== firebaseUser.uid && messageTime && seenAt >= messageTime)
        .map(([uid]) => uid);
      message.seenByMembers = seenMemberIds;
      if (seenMemberIds.length) message.status = "seen";
    });
    return;
  }
  const seenAt = conversation.seenBy?.[conversation.userId] || 0;
  if (!seenAt) return;
  conversation.messages.forEach((message) => {
    if (message.from !== "me") return;
    const messageTime = message.createdAtMs || message.localOrder || 0;
    if (messageTime && messageTime <= seenAt) message.status = "seen";
  });
}

function applyDeliveryState(conversation) {
  if (!conversation || !firebaseUser) return;
  const deliveredAt = conversation.deliveredBy?.[conversation.userId] || 0;
  conversation.messages.forEach((message) => {
    if (message.from !== "me") return;
    if (message.status === "seen" || message.status === "pending") return;
    const messageTime = message.createdAtMs || message.localOrder || 0;
    if (message.status === "delivered" || (deliveredAt && messageTime && messageTime <= deliveredAt)) {
      message.status = "delivered";
      return;
    }
    message.status = "sent";
  });
}

function acknowledgeConversationDelivered(conversation, ownerUid = firebaseUser?.uid) {
  if (!ownerUid || !conversation?.chatId || !conversation.lastSenderId || conversation.lastSenderId === ownerUid) return;
  const deliveryKey = `${conversation.chatId}:${conversation.updatedAt || conversation.lastMessage || ""}`;
  if (deliveredAckCache.get(conversation.chatId) === deliveryKey) return;
  deliveredAckCache.set(conversation.chatId, deliveryKey);
  const deliveredAt = Date.now();
  conversation.deliveredBy = {
    ...(conversation.deliveredBy || {}),
    [ownerUid]: deliveredAt
  };
  setDoc(doc(db, "chats", conversation.chatId), {
    deliveredBy: {
      [ownerUid]: deliveredAt
    }
  }, { merge: true }).catch(() => {
    deliveredAckCache.delete(conversation.chatId);
  });
}

function getMessageReaction(reactionEntry) {
  if (!reactionEntry || typeof reactionEntry !== "object") return "";
  return Object.values(reactionEntry).find((reaction) => reaction === "heart") || "";
}

function applyConversationReactions(conversation) {
  if (!conversation?.messages) return;
  const reactionsByMessage = conversation.reactionsByMessage || {};
  conversation.messages.forEach((message) => {
    if (!message?.id || !Object.prototype.hasOwnProperty.call(reactionsByMessage, message.id)) return;
    message.reactionsBy = reactionsByMessage[message.id] || {};
    message.reaction = getMessageReaction(message.reactionsBy);
  });
}

function replySnippet(message) {
  if (!message) return "";
  if (message.type === "photo") return "Photo";
  if (message.type === "voice") return "Voice";
  return String(message.text || "").slice(0, 120);
}

function setReplyMessage(message) {
  if (!message) return;
  activeReplyMessage = {
    id: message.id,
    from: message.from,
    senderId: message.senderId || (message.from === "me" ? firebaseUser?.uid : currentConversation?.userId),
    name: message.from === "me" ? "You" : currentConversation?.name || "User",
    text: replySnippet(message),
    type: message.type || "text"
  };
  updateReplyPreview();
  messageInput.focus();
}

function clearReplyMessage() {
  activeReplyMessage = null;
  updateReplyPreview();
}

function updateReplyPreview() {
  if (!replyPreview) return;
  replyPreview.classList.toggle("hidden", !activeReplyMessage);
  replyPreviewName.textContent = activeReplyMessage?.name || "";
  replyPreviewText.textContent = activeReplyMessage?.text || "";
}

function attachReply(message) {
  return activeReplyMessage ? { ...activeReplyMessage } : null;
}

function setLocalMessageReaction(conversation, message, reactionValue) {
  if (!conversation || !message || !firebaseUser) return;
  conversation.reactionsByMessage = conversation.reactionsByMessage || {};
  const currentEntry = conversation.reactionsByMessage[message.id] || {};
  conversation.reactionsByMessage[message.id] = {
    ...currentEntry,
    [firebaseUser.uid]: reactionValue
  };
  message.reactionsBy = conversation.reactionsByMessage[message.id];
  message.reaction = getMessageReaction(message.reactionsBy);
}

async function syncMessageReaction(conversation, message, reactionValue) {
  if (!firebaseUser || !conversation?.chatId || !message?.id) return;
  try {
    await updateDoc(doc(db, "chats", conversation.chatId), {
      [`reactionsByMessage.${message.id}.${firebaseUser.uid}`]: reactionValue
    });
  } catch (error) {
    console.warn("Message reaction sync failed", error);
  }
}

function removeLocalMessage(uid, chatId, messageId) {
  const messagesList = readLocalMessages(uid, chatId).filter((message) => message.id !== messageId);
  writeLocalMessages(uid, chatId, messagesList);
}

function clearLocalMessages(uid, chatId) {
  if (!uid || !chatId) return;
  localStorage.removeItem(localMessagesKey(uid, chatId));
}

function keepOutgoingConversationVisible(conversation, ttl = 12000) {
  if (!conversation?.chatId) return;
  outgoingVisibleChats.set(conversation.chatId, {
    conversation,
    expiresAt: Date.now() + ttl
  });
}

function consumeVisibleOutgoingRows(existingRows = []) {
  const existingIds = new Set(existingRows.map((row) => row.chatId || row.id));
  const now = Date.now();
  const rows = [];
  outgoingVisibleChats.forEach((entry, chatId) => {
    if (entry.expiresAt <= now) {
      outgoingVisibleChats.delete(chatId);
      return;
    }
    if (!existingIds.has(chatId) && entry.conversation) rows.push(entry.conversation);
  });
  return rows;
}

async function cleanupCachedRemoteMessages(chatId, messagesList) {
  if (!chatId || !firebaseUser) return;
  await Promise.all(messagesList
    .filter((message) => message.encrypted && message.senderId && message.senderId !== firebaseUser.uid)
    .map((message) => deleteDoc(doc(db, "chats", chatId, "messages", message.id)).catch(() => {})));
}

function deleteExpiredMessages(chatId, messageDocs) {
  const cutoff = Date.now() - messageRetentionMs;

  messageDocs.forEach((messageDoc) => {
    const createdAt = messageDoc.data().createdAt;
    const createdAtMs = createdAt?.toMillis?.();
    if (!createdAtMs || createdAtMs > cutoff) return;
    deleteDoc(doc(db, "chats", chatId, "messages", messageDoc.id));
  });
}

function canMarkConversationSeen(conversation) {
  if (!firebaseUser || !conversation?.chatId) return false;
  if (seenAllowedChatId !== conversation.chatId) return false;
  if (document.visibilityState !== "visible") return false;
  if (currentConversation?.chatId !== conversation.chatId) return false;
  if (!chatScreen.classList.contains("active")) return false;
  if (!desktopQuery.matches && !phoneShell.classList.contains("chat-open")) return false;
  return true;
}

function markConversationSeen(conversation) {
  if (!canMarkConversationSeen(conversation)) return;

  let changed = false;
  conversation.messages.forEach((message) => {
    if (message.from === "me" || message.status === "seen") return;
    if (message.createdAtMs && message.createdAtMs <= Date.now() - messageRetentionMs) return;
    message.status = "seen";
    changed = true;
    updateDoc(doc(db, "chats", conversation.chatId, "messages", message.id), {
      status: "seen"
    }).catch(() => {});
  });
  conversation.unread = 0;
  const seenAt = Date.now();
  conversation.seenBy = {
    ...(conversation.seenBy || {}),
    [firebaseUser.uid]: seenAt
  };
  setDoc(doc(db, "chats", conversation.chatId), {
    seenBy: {
      [firebaseUser.uid]: seenAt
    },
    unreadBy: {
      [firebaseUser.uid]: 0
    }
  }, { merge: true }).catch(() => {});
  writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
  if (changed) renderConversations(searchInput.value);
}

function subscribeToPresence(conversation) {
  if (unsubscribePresence) unsubscribePresence();
  window.clearTimeout(presenceRefreshTimer);
  presenceRefreshTimer = null;
  activePresenceUserId = conversation?.userId || null;
  if (!conversation?.userId || conversation?.isGroup) return;

  const userId = conversation.userId;
  unsubscribePresence = onValue(ref(realtimeDb, `status/${userId}`), (snapshot) => {
    if (activePresenceUserId !== userId) return;
    const value = snapshot.val();
    const nextStatus = formatPresenceStatus(value);
    conversation.status = nextStatus;
    applyPresenceStatus(userId, nextStatus);
    schedulePresenceRefresh(userId, value);
  });
}

function formatPresenceStatus(value, confirmedOffline = false) {
  if (value?.state === "online") return "Active now";

  const lastChanged = typeof value?.lastChanged === "number" ? value.lastChanged : 0;
  if (!lastChanged) return "Offline";

  const elapsed = Math.max(0, Date.now() - lastChanged);
  if (value?.state === "offline" && !confirmedOffline && elapsed < 10000) return "Active now";
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "Active moments ago";
  if (minutes < 60) return `Active ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Active yesterday";
  return `Active ${days}d ago`;
}

function latestMessage(conversation) {
  return conversation.messages[conversation.messages.length - 1]?.text || conversation.lastMessage || "";
}

function latestSenderId(conversation) {
  const latest = conversation.messages[conversation.messages.length - 1];
  if (!latest) return conversation.lastSenderId || "";
  return latest.senderId || (latest.from === "me" ? firebaseUser?.uid : conversation.userId) || "";
}

function getConversationLastTimeMs(conversation) {
  const latest = conversation?.messages?.[conversation.messages.length - 1];
  return latest?.createdAtMs
    || latest?.localOrder
    || conversation?.updatedAt
    || conversation?.lastTimeMs
    || 0;
}

function formatConversationTime(conversation) {
  const timeMs = getConversationLastTimeMs(conversation);
  if (!timeMs) return conversation?.time || "Now";
  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const messageStart = new Date(timeMs);
  messageStart.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((todayStart.getTime() - messageStart.getTime()) / (24 * 60 * 60 * 1000));

  if (isSameCalendarDay(timeMs, now)) {
    return now - timeMs < 60 * 60 * 1000 ? "Now" : formatClockTime(timeMs);
  }
  if (dayDiff < 7) return formatWeekday(timeMs);
  return formatCalendarDate(timeMs);
}

async function syncVisibleLastMessage(conversation) {
  if (!conversation?.chatId || !firebaseUser) return;

  const latestVisibleMessage = conversation.messages[conversation.messages.length - 1];
  conversation.lastMessage = latestVisibleMessage?.text || "";
  conversation.lastSenderId = latestVisibleMessage ? latestSenderId(conversation) : "";

  await setDoc(doc(db, "chats", conversation.chatId), {
    hiddenLastBy: {
      [firebaseUser.uid]: {
        text: conversation.lastMessage ? (latestVisibleMessage?.type === "photo" ? "Photo" : "Message") : "",
        senderId: conversation.lastSenderId,
        time: conversation.lastMessage ? "Now" : ""
      }
    },
    updatedAt: firestoreServerTimestamp()
  }, { merge: true });
}

function moveConversationToTop(conversation) {
  conversation.updatedAt = Date.now();
  if (conversation.chatId || conversation.id) {
    localConversationOrder.set(conversation.chatId || conversation.id, conversation.updatedAt);
  }
  const index = conversations.findIndex((item) => item.id === conversation.id);
  if (index >= 0) {
    conversations.splice(index, 1);
    conversations.push(conversation);
  }
  sortConversations();
}

function ensureMessageData() {
  conversations.forEach((conversation) => {
    conversation.muted = conversation.muted || false;
    conversation.messages.forEach((message, index) => {
      message.id = message.id || `${conversation.id}-${index}-${message.from}`;
      message.time = message.time || conversation.time;
      message.date = message.date || "Today";
      if (message.from === "me") {
        message.status = message.status || "seen";
      }
    });
  });
}

function renderConversations(filter = "") {
  if (Date.now() < suppressConversationRenderUntil) {
    refreshConversationRowsState();
    return;
  }

  const query = filter.trim().toLowerCase();
  chatList.innerHTML = "";
  renderStories();

  conversations
    .filter((conversation) => !conversation.archived)
    .filter((conversation) => {
      const haystack = `${conversation.name} ${latestMessage(conversation)}`.toLowerCase();
      return haystack.includes(query);
    })
    .forEach((conversation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `conversation${conversation.id === currentConversation?.id ? " selected" : ""}${conversation.unread ? " unread" : ""}`;
      button.dataset.conversationId = conversation.id;

      const avatar = document.createElement("img");
      avatar.src = conversation.avatar;
      avatar.alt = "";

      const avatarWrap = document.createElement("span");
      avatarWrap.className = `conversation-avatar-wrap${conversation.status === "Active now" ? " active" : ""}`;
      avatarWrap.appendChild(avatar);

      const text = document.createElement("span");
      text.className = "conversation-text";

      const name = document.createElement("strong");
      setVerifiedName(name, conversation.name, conversation.verified);
      if (conversation.pinned) {
        const pinIcon = document.createElement("span");
        pinIcon.className = "pin-icon";
        pinIcon.setAttribute("aria-label", "Pinned");
        pinIcon.appendChild(createSvgIcon(iconPaths.pin, "pin-icon-svg"));
        name.appendChild(pinIcon);
      }
      if (conversation.muted) {
        const muteIcon = document.createElement("span");
        muteIcon.className = "mute-icon";
        muteIcon.setAttribute("aria-label", "Muted");
        muteIcon.appendChild(createSvgIcon(iconPaths.muted, "mute-icon-svg"));
        name.appendChild(muteIcon);
      }

      const preview = document.createElement("p");
      preview.textContent = latestMessage(conversation);

      const meta = document.createElement("span");
      meta.className = "conversation-meta";

      const time = document.createElement("time");
      time.textContent = formatConversationTime(conversation);

      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openConversationMenu(button, conversation);
      });

      text.append(name, preview);

      if (conversation.unread) {
        const dot = document.createElement("span");
        dot.className = "unread-dot";
        dot.textContent = String(conversation.unread);
        dot.setAttribute("aria-label", `${conversation.unread} unread messages`);
        meta.appendChild(dot);
      } else {
        meta.appendChild(time);
      }

      button.append(avatarWrap, text, meta);
      chatList.appendChild(button);
    });
}

function refreshConversationRowsState() {
  chatList.querySelectorAll(".conversation").forEach((row) => {
    const conversation = conversationFromElement(row);
    if (!conversation) return;
    row.classList.toggle("selected", conversation.id === currentConversation?.id);
    row.classList.toggle("unread", !!conversation.unread);
    const meta = row.querySelector(".conversation-meta");
    if (!meta) return;
    meta.replaceChildren();
    if (conversation.unread) {
      const dot = document.createElement("span");
      dot.className = "unread-dot";
      dot.textContent = String(conversation.unread);
      dot.setAttribute("aria-label", `${conversation.unread} unread messages`);
      meta.appendChild(dot);
    } else {
      const time = document.createElement("time");
      time.textContent = formatConversationTime(conversation);
      meta.appendChild(time);
    }
  });
}

function conversationFromElement(element) {
  const row = element?.closest?.(".conversation");
  if (!row?.dataset?.conversationId) return null;
  return conversations.find((conversation) => conversation.id === row.dataset.conversationId) || null;
}

function openConversationFromPress(conversationId) {
  if (!conversationId) return;
  const now = Date.now();
  if (lastConversationOpenId === conversationId && now - lastConversationPointerOpenAt < 350) return;
  if (currentConversation?.id === conversationId && chatScreen.classList.contains("active")) return;
  const exists = conversations.some((conversation) => conversation.id === conversationId);
  if (!exists) return;
  closeConversationMenu();
  openConversation(conversationId);
  lastConversationOpenId = conversationId;
  lastConversationPointerOpenAt = now;
}

function openConversationProfileFromPress(conversationId) {
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  closeConversationMenu();
  openFriendProfile(conversation);
  lastConversationPointerOpenAt = Date.now();
}

chatList.addEventListener("pointerdown", (event) => {
  if (event.button && event.button !== 0) return;
  const row = event.target.closest(".conversation");
  const conversation = conversationFromElement(event.target);
  if (!row || !conversation) return;

  pendingConversationPress = {
    id: conversation.id,
    x: event.clientX,
    y: event.clientY,
    anchor: row,
    profileTarget: !!event.target.closest(".conversation-avatar-wrap")
  };
  longPressTriggered = false;
  window.clearTimeout(conversationHoldTimer);
  conversationHoldTimer = window.setTimeout(() => {
    if (!pendingConversationPress || pendingConversationPress.id !== conversation.id) return;
    longPressTriggered = true;
    suppressConversationClickUntil = Date.now() + 900;
    openConversationMenu(row, conversation, pendingConversationPress);
  }, 520);
});

chatList.addEventListener("pointermove", (event) => {
  if (!pendingConversationPress) return;
  if (longPressTriggered) return;
  const moved = Math.hypot(event.clientX - pendingConversationPress.x, event.clientY - pendingConversationPress.y);
  if (moved <= 24) return;
  pendingConversationPress = null;
  window.clearTimeout(conversationHoldTimer);
  longPressTriggered = false;
});

document.addEventListener("pointerup", (event) => {
  if (!pendingConversationPress) return;
  if (longPressTriggered) {
    event.preventDefault();
    event.stopPropagation();
    suppressConversationClickUntil = Date.now() + 900;
    pendingConversationPress = null;
    window.clearTimeout(conversationHoldTimer);
    window.setTimeout(() => {
      longPressTriggered = false;
    }, 0);
    return;
  }

  pendingConversationPress = null;
  window.clearTimeout(conversationHoldTimer);
  longPressTriggered = false;
}, true);

document.addEventListener("pointercancel", () => {
  pendingConversationPress = null;
  window.clearTimeout(conversationHoldTimer);
  longPressTriggered = false;
}, true);

chatList.addEventListener("click", (event) => {
  const row = event.target.closest(".conversation");
  if (!row) {
    clearDesktopConversationSelection();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (longPressTriggered || Date.now() < suppressConversationClickUntil || (activeConversationMenu && Date.now() - menuOpenedAt < 700)) return;
  closeConversationMenu();
  if (event.target.closest(".conversation-avatar-wrap")) {
    openConversationProfileFromPress(row.dataset.conversationId);
  } else {
    openConversationFromPress(row.dataset.conversationId);
  }
});

function renderStories() {
  if (!storyRow) return;
  storyRow.innerHTML = "";
  visibleConversations()
    .filter((conversation) => conversation.status === "Active now")
    .forEach((conversation) => {
    const story = document.createElement("button");
    story.className = "story active";
    story.type = "button";
    story.addEventListener("click", () => openConversation(conversation.id));

    const avatar = document.createElement("img");
    avatar.src = conversation.avatar;
    avatar.alt = "";

    const name = document.createElement("span");
    setVerifiedName(name, conversation.name.split(" ")[0] || conversation.name, conversation.verified);

    story.append(avatar, name);
    storyRow.appendChild(story);
  });
}

const iconPaths = {
  markUnread: "M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9A2.5 2.5 0 0 1 17.5 17h-11A2.5 2.5 0 0 1 4 14.5v-9Zm2.5-.5a.5.5 0 0 0-.5.5v.63l6 4.05 6-4.05V5.5a.5.5 0 0 0-.5-.5h-11Zm11.5 3.55-5.44 3.67a1 1 0 0 1-1.12 0L6 8.55v5.95a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V8.55Zm1.5-5.05h1a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z",
  markRead: "M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9A2.5 2.5 0 0 1 17.5 17h-11A2.5 2.5 0 0 1 4 14.5v-9Zm2.5-.5a.5.5 0 0 0-.5.5v.63l6 4.05 6-4.05V5.5a.5.5 0 0 0-.5-.5h-11Zm11.5 3.55-5.44 3.67a1 1 0 0 1-1.12 0L6 8.55v5.95a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V8.55Z",
  pin: "m22.707 7.583-6.29-6.29a1 1 0 0 0-1.414 0 5.183 5.183 0 0 0-1.543 3.593L8.172 8.79a5.161 5.161 0 0 0-4.768 1.42 1 1 0 0 0 0 1.414l3.779 3.778-5.89 5.89a1 1 0 1 0 1.414 1.414l5.89-5.89 3.778 3.779a1 1 0 0 0 1.414 0 5.174 5.174 0 0 0 1.42-4.769l3.905-5.287a5.183 5.183 0 0 0 3.593-1.543 1 1 0 0 0 0-1.414Zm-3.979.941a.974.974 0 0 0-.908.4l-4.512 6.111a1 1 0 0 0-.14.927 3.037 3.037 0 0 1-.194 2.403l-7.34-7.339a3.042 3.042 0 0 1 2.403-.196.994.994 0 0 0 .927-.138l6.111-4.512a.999.999 0 0 0 .4-.909 3.086 3.086 0 0 1 .342-1.75l4.662 4.662a3.072 3.072 0 0 1-1.75.341Z",
  muted: "M15.209 18.294a1 1 0 0 0-.707-.293H6.184a2.002 2.002 0 0 1-1.74-2.993l.47-.822a8.34 8.34 0 0 0 1.093-4.174c0-.159.005-.316.017-.471a1 1 0 1 0-1.994-.15 8.093 8.093 0 0 0-.023.63 6.341 6.341 0 0 1-.83 3.175l-.47.822a4.001 4.001 0 0 0 3.477 5.983h1.944a4 4 0 0 0 7.827-.382 1 1 0 0 0-.282-.86Zm-3.207 2.708a2 2 0 0 1-1.732-1.001h3.463a2.017 2.017 0 0 1-1.731 1.001Zm11.205.291-2.521-2.521a4.04 4.04 0 0 0 .976-1.629 3.957 3.957 0 0 0-.356-3.123l-.484-.853A6.358 6.358 0 0 1 20 9.997a7.953 7.953 0 0 0-4.745-7.302 3.972 3.972 0 0 0-6.51.002 8.011 8.011 0 0 0-2.438 1.697L2.707.793a1 1 0 0 0-1.414 1.414l20.5 20.5a1 1 0 0 0 1.414-1.414Zm-3.46-4.728a2.042 2.042 0 0 1-.468.8L7.72 5.805a6.004 6.004 0 0 1 2.068-1.377.998.998 0 0 0 .494-.426 1.976 1.976 0 0 1 3.439 0 1 1 0 0 0 .494.425 5.989 5.989 0 0 1 3.786 5.634 8.303 8.303 0 0 0 1.082 4.094l.483.852a1.975 1.975 0 0 1 .181 1.558Z",
  archive: "M4 3h16a2 2 0 0 1 2 2v3a2 2 0 0 1-1 1.73V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.73A2 2 0 0 1 2 8V5a2 2 0 0 1 2-2Zm1 7v9h14v-9H5Zm-1-5v3h16V5H4Zm5 7h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z",
  block: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 0 0-5.66 13.66L17.66 6.34A7.97 7.97 0 0 0 12 4Zm7.66 3.76L7.76 19.66A8 8 0 0 0 19.66 7.76Z",
  photo: "M18.44 2.004A3.56 3.56 0 0 1 22 5.564v12.873a3.56 3.56 0 0 1-3.56 3.56H5.568a3.56 3.56 0 0 1-3.56-3.56V5.563a3.56 3.56 0 0 1 3.56-3.56h12.872Zm0 2H5.568a1.56 1.56 0 0 0-1.56 1.56v9.24l3.22-3.22a2 2 0 0 1 2.828 0l1.265 1.265 3.112-3.112a2 2 0 0 1 2.828 0L20 12.476V5.564a1.56 1.56 0 0 0-1.56-1.56ZM7.5 8.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z",
  trash: "M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1.1l-.82 12.25A3 3 0 0 1 15.08 22H8.92a3 3 0 0 1-2.99-2.75L5.1 7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1Zm1 2h4v-.01h-4V5Zm-2.9 2 .82 12.12a1 1 0 0 0 1 .88h6.16a1 1 0 0 0 1-.88L16.9 7H7.1Zm2.9 3a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
};

function createSvgIcon(path, className = "menu-action-icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.appendChild(shape);
  return svg;
}

function createConversationMenuButton(label, path, handler, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = options.danger ? "danger" : "";
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text, createSvgIcon(path));
  button.addEventListener("click", handler);
  return button;
}

async function setConversationUnread(conversation, unread) {
  conversation.unread = unread;
  if (conversation.chatId && firebaseUser) {
    await setDoc(doc(db, "chats", conversation.chatId), {
      unreadBy: {
        [firebaseUser.uid]: unread
      }
    }, { merge: true });
  }
}

async function setConversationMuted(conversation, muted) {
  conversation.muted = muted;
  if (conversation.chatId && firebaseUser) {
    await setDoc(doc(db, "chats", conversation.chatId), {
      mutedBy: {
        [firebaseUser.uid]: muted
      }
    }, { merge: true });
  }
}

function openConversationMenu(anchor, conversation, position = null) {
  closeConversationMenu();
  menuOpenedAt = Date.now();

  const menu = document.createElement("div");
  menu.className = "conversation-action-menu active";
  menu.addEventListener("click", (event) => {
    if (Date.now() - menuOpenedAt < 450) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
  });
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());

  const readButton = createConversationMenuButton(
    conversation.unread ? "Mark as read" : "Mark as unread",
    conversation.unread ? iconPaths.markRead : iconPaths.markUnread,
    async () => {
      await setConversationUnread(conversation, conversation.unread ? 0 : 1);
      closeConversationMenu();
      renderConversations(searchInput.value);
    }
  );

  const muteButton = createConversationMenuButton(conversation.muted ? "Unmute" : "Mute", iconPaths.muted, async () => {
    await setConversationMuted(conversation, !conversation.muted);
    closeConversationMenu();
    renderMessages();
    renderConversations(searchInput.value);
  });

  const pinButton = createConversationMenuButton(conversation.pinned ? "Unpin" : "Pin", iconPaths.pin, async () => {
    const nextPinned = !conversation.pinned;
    conversation.pinned = nextPinned;
    if (nextPinned && !conversation.pinnedAt) {
      conversation.pinnedAt = Date.now();
    }
    if (conversation.chatId) {
      await setDoc(doc(db, "chats", conversation.chatId), {
        pinnedBy: {
          [firebaseUser.uid]: conversation.pinned
        },
        pinnedAtBy: {
          [firebaseUser.uid]: conversation.pinnedAt || Date.now()
        }
      }, { merge: true });
    }
    closeConversationMenu();
    sortConversations();
    renderConversations(searchInput.value);
  });

  const archiveButton = createConversationMenuButton("Archive", iconPaths.archive, async () => {
    const ok = await showConfirmDialog({
      title: "Archive chat?",
      message: conversation.name,
      confirmText: "Archive"
    });
    if (!ok) return;
    await setConversationArchiveState(conversation, true);
    afterConversationHidden(conversation);
  });

  const blockButton = createConversationMenuButton(conversation.blockedByMe ? "Unblock" : "Block", iconPaths.block, async () => {
    if (conversation.blockedByMe) {
      await setConversationBlockState(conversation, false);
      closeConversationMenu();
      renderMessages();
      renderConversations(searchInput.value);
      return;
    }
    const ok = await showConfirmDialog({
      title: "Block user?",
      message: conversation.name,
      confirmText: "Block",
      danger: true
    });
    if (!ok) return;
    await setConversationBlockState(conversation, true);
    afterConversationHidden(conversation, { keepOpen: true });
    renderMessages();
  }, { danger: true });
  if (conversation.blockedByThem && !conversation.blockedByMe) {
    blockButton.disabled = true;
  }

  const deleteButton = createConversationMenuButton("Delete", iconPaths.trash, async () => {
    const ok = await showConfirmDialog({
      title: "Delete chat?",
      message: conversation.name,
      confirmText: "Delete",
      danger: true
    });
    if (!ok) return;
    await deleteConversationForCurrentUser(conversation);
  }, { danger: true });

  menu.append(readButton, pinButton, muteButton, archiveButton, blockButton, deleteButton);
  phoneShell.appendChild(menu);
  const shellRect = phoneShell.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const pointX = typeof position?.x === "number" ? position.x - shellRect.left : anchorRect.right - shellRect.left - 14;
  const pointY = typeof position?.y === "number" ? position.y - shellRect.top : anchorRect.top - shellRect.top + 6;
  const left = Math.min(Math.max(pointX - menuRect.width / 2, 12), shellRect.width - menuRect.width - 12);
  const top = Math.min(Math.max(pointY + 10, 12), shellRect.height - menuRect.height - 12);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  activeConversationMenu = menu;
  activeConversationMenuAnchor = anchor;
}

function closeConversationMenu() {
  if (!activeConversationMenu) return;
  activeConversationMenu.remove();
  activeConversationMenu = null;
  activeConversationMenuAnchor = null;
  longPressTriggered = false;
  menuOpenedAt = 0;
}

function showConfirmDialog({ title, message, confirmText, danger = false, copyTextValue = "", copyButtonText = "Copy", highlightTextValue = "" }) {
  if (activeConfirmDialog) activeConfirmDialog.remove();
  closeConversationMenu();
  confirmOpenedAt = Date.now();

  return new Promise((resolve) => {
    const overlay = document.createElement("section");
    overlay.className = "confirm-overlay active";
    overlay.setAttribute("aria-hidden", "false");

    const dialog = document.createElement("article");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const heading = document.createElement("h3");
    heading.textContent = title;

    const text = document.createElement("p");
    if (highlightTextValue && message.includes(highlightTextValue)) {
      const [before, after] = message.split(highlightTextValue);
      const highlight = document.createElement("span");
      highlight.className = "confirm-highlight";
      highlight.textContent = highlightTextValue;
      text.append(document.createTextNode(before), highlight, document.createTextNode(after));
    } else {
      text.textContent = message;
    }

    const actions = document.createElement("div");
    actions.className = "confirm-actions";
    if (copyTextValue) actions.classList.add("has-extra");

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = copyButtonText;

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = danger ? "danger" : "";
    confirmButton.textContent = confirmText;

    const close = (value) => {
      overlay.remove();
      activeConfirmDialog = null;
      confirmOpenedAt = 0;
      resolve(value);
    };

    dialog.addEventListener("click", (event) => event.stopPropagation());
    cancelButton.addEventListener("click", () => close(false));
    copyButton.addEventListener("click", async () => {
      const copied = await copyText(copyTextValue);
      copyButton.textContent = copied ? "Copied" : "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = copyButtonText;
      }, 1400);
    });
    confirmButton.addEventListener("click", () => close(true));

    actions.append(cancelButton);
    if (copyTextValue) actions.append(copyButton);
    actions.append(confirmButton);
    dialog.append(heading, text, actions);
    overlay.appendChild(dialog);
    phoneShell.appendChild(overlay);
    activeConfirmDialog = overlay;
    confirmButton.focus();
  });
}

function sortConversations() {
  conversations.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) return (a.pinnedAt || 0) - (b.pinnedAt || 0);
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function toggleHomeOptions() {
  const isOpen = homeOptionsMenu.classList.toggle("active");
  homeOptionsMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeHomeOptions() {
  homeOptionsMenu.classList.remove("active");
  homeOptionsMenu.setAttribute("aria-hidden", "true");
}

function toggleFabActions() {
  const isOpen = fabActions.classList.toggle("active");
  fabActions.setAttribute("aria-hidden", String(!isOpen));
  addUserButton.classList.toggle("active", isOpen);
  if (isOpen) {
    closeHomeOptions();
    closeUserFinder();
  }
}

function closeFabActions() {
  fabActions.classList.remove("active");
  fabActions.setAttribute("aria-hidden", "true");
  addUserButton.classList.remove("active");
}

function friendRowsForGroup() {
  const seen = new Set();
  return conversations.filter((conversation) => {
    if (conversation.isGroup || !conversation.userId || conversation.blocked) return false;
    if (seen.has(conversation.userId)) return false;
    seen.add(conversation.userId);
    return true;
  });
}

function groupAdmins(conversation) {
  return new Set(conversation?.admins?.length ? conversation.admins : [conversation?.adminId].filter(Boolean));
}

function currentUserIsGroupAdmin(conversation) {
  return groupAdmins(conversation).has(firebaseUser?.uid);
}

function pendingGroupRequests(conversation) {
  return (conversation?.pendingAddRequests || []).filter((request) => request?.status === "pending");
}

function refreshGroupRequestBadge() {
  const count = currentConversation?.isGroup ? pendingGroupRequests(currentConversation).length : 0;
  groupRequestBadge.hidden = count <= 0;
  groupRequestBadge.textContent = String(count);
  chatGroupRequestsButton.hidden = !currentConversation?.isGroup || count <= 0;
  chatGroupRequestsButton.textContent = count ? `Requests (${count})` : "Requests";
}

async function saveGroupMembers(group, name, memberIds) {
  const participants = Array.from(new Set([firebaseUser.uid, ...memberIds]));
  const chatId = group?.chatId || groupId();
  const admins = group?.admins?.length ? group.admins : [group?.adminId || firebaseUser.uid];
  const payload = {
    type: "group",
    groupName: name,
    adminId: group?.adminId || firebaseUser.uid,
    admins,
    participants,
    lastTime: group?.time || "Now",
    updatedAt: firestoreServerTimestamp(),
    createdAt: group?.chatId ? group.createdAt || firestoreServerTimestamp() : firestoreServerTimestamp()
  };
  if (group?.pendingAddRequests) {
    payload.pendingAddRequests = pendingGroupRequests(group).filter((request) => !memberIds.includes(request.uid));
  }
  await setDoc(doc(db, "chats", chatId), payload, { merge: true });
  return { chatId, participants, payload };
}

function openAddGroup(group = currentConversation?.isGroup ? currentConversation : null) {
  closeFabActions();
  closeHomeOptions();
  closeChatOptions();
  if (!firebaseUser) return;
  const isExistingGroup = !!group?.isGroup;
  const isGroupAdmin = !isExistingGroup || currentUserIsGroupAdmin(group);

  const friends = friendRowsForGroup();
  if (!friends.length) {
    window.alert("Group create korte age friend add koro.");
    return;
  }

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay group-overlay active";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog group-dialog";
  dialog.addEventListener("click", (event) => event.stopPropagation());

  const heading = document.createElement("h3");
  heading.textContent = isExistingGroup ? (isGroupAdmin ? "Add member" : "Add request") : "Add group";

  const nameLabel = document.createElement("label");
  const nameText = document.createElement("span");
  nameText.textContent = "Group name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Group name";
  nameInput.value = group?.name || "";
  nameLabel.append(nameText, nameInput);

  const memberTitle = document.createElement("strong");
  memberTitle.textContent = "Friends";

  const members = document.createElement("div");
  members.className = "group-member-list";
  const currentMembers = new Set(group?.participants || group?.memberIds || []);
  const pendingIds = new Set(pendingGroupRequests(group).map((request) => request.uid));
  const selectableFriends = isExistingGroup
    ? friends.filter((friend) => !currentMembers.has(friend.userId) && !pendingIds.has(friend.userId))
    : friends;
  selectableFriends.forEach((friend) => {
    const row = document.createElement("label");
    row.className = "group-member-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = friend.userId;
    input.checked = !isExistingGroup;
    const avatar = document.createElement("img");
    avatar.src = friend.avatar;
    avatar.alt = "";
    const name = document.createElement("span");
    name.textContent = friend.name;
    row.append(input, avatar, name);
    members.appendChild(row);
  });
  if (!selectableFriends.length) {
    const empty = document.createElement("p");
    empty.className = "group-dialog-message";
    empty.textContent = "Add korar moto new friend nai.";
    members.appendChild(empty);
  }

  const message = document.createElement("p");
  message.className = "group-dialog-message";

  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = isExistingGroup ? (isGroupAdmin ? "Add" : "Send request") : "Create";
  saveButton.className = "confirm-primary";

  const close = () => {
    overlay.remove();
    activeConfirmDialog = null;
  };
  cancelButton.addEventListener("click", close);
  overlay.addEventListener("click", close);
  saveButton.addEventListener("click", async () => {
    const name = nameInput.value.trim() || "New group";
    const selected = [...members.querySelectorAll("input:checked")].map((input) => input.value);
    if (!selected.length) {
      message.textContent = "Minimum 1 friend select koro.";
      return;
    }
    setAuthLoading(saveButton, true);
    try {
      if (isExistingGroup && !isGroupAdmin) {
        const existingRequests = pendingGroupRequests(group);
        const selectedRequests = selected.map((uid) => {
          const friend = friends.find((item) => item.userId === uid);
          return {
            uid,
            name: friend?.name || "User",
            avatar: friend?.avatar || defaultAvatar,
            number: friend?.number || "",
            requesterId: firebaseUser.uid,
            requesterName: myProfile.name || "Member",
            status: "pending",
            requestedAt: Date.now()
          };
        });
        group.pendingAddRequests = [...existingRequests, ...selectedRequests];
        await updateGroup(group, { pendingAddRequests: group.pendingAddRequests });
        refreshGroupRequestBadge();
        close();
        return;
      }
      const memberIds = isExistingGroup
        ? Array.from(new Set([...(group.participants || group.memberIds || []), ...selected]))
        : selected;
      const result = await saveGroupMembers(group, name, memberIds);
      const conversation = group || groupToConversation(result.chatId, result.payload);
      const participants = isExistingGroup ? memberIds : result.participants;
      Object.assign(conversation, {
        id: result.chatId,
        chatId: result.chatId,
        isGroup: true,
        name,
        adminId: result.payload.adminId,
        admins: result.payload.admins,
        participants,
        memberIds: participants,
        pendingAddRequests: result.payload.pendingAddRequests || group?.pendingAddRequests || [],
        status: `${participants.length} members`,
        avatar: group?.avatar || defaultAvatar,
        messages: group?.messages || [],
        messagesLoaded: !!group?.messagesLoaded,
        lastMessage: group?.lastMessage || "",
        time: "Now"
      });
      if (!conversations.some((item) => item.id === conversation.id)) conversations.unshift(conversation);
      close();
      renderConversations(searchInput.value);
      openConversation(conversation.id);
      refreshGroupRequestBadge();
    } catch (error) {
      message.textContent = error.message || "Group save hoy nai";
    } finally {
      setAuthLoading(saveButton, false);
    }
  });

  actions.append(cancelButton, saveButton);
  if (isExistingGroup) {
    dialog.append(heading, memberTitle, members, message, actions);
  } else {
    dialog.append(heading, nameLabel, memberTitle, members, message, actions);
  }
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  activeConfirmDialog = overlay;
  confirmOpenedAt = Date.now();
  nameInput.focus();
}

function toggleUserFinder() {
  closeFabActions();
  const isOpen = userFinderPanel.classList.toggle("active");
  userFinderPanel.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) {
    updateUserSearchButton();
    userSearchNumber.focus();
  }
}

function closeUserFinder() {
  userFinderPanel.classList.remove("active");
  userFinderPanel.setAttribute("aria-hidden", "true");
  userSearchButton.classList.remove("active");
}

function updateUserSearchButton() {
  const cleanValue = sanitizeUserSearchValue(userSearchNumber.value);
  if (userSearchNumber.value !== cleanValue) userSearchNumber.value = cleanValue;
  userSearchButton.classList.toggle("active", cleanValue.length > 0);
}

function findConversationByUser(user) {
  const uid = user.uid || user.id;
  return conversations.find((conversation) => conversation.userId === uid || conversation.number === user.number);
}

function createConversationFromUser(user) {
  return userToConversation(user);
}

async function addOrOpenUserChat(user) {
  let conversation = findConversationByUser(user);
  const candidate = conversation || createConversationFromUser(user);

  if (!canMessageConversation(candidate)) {
    window.alert(restrictedMessage(candidate));
    return;
  }

  if (!conversation) {
    conversation = userToConversation(user);
    conversations.unshift(conversation);
  } else {
    moveConversationToTop(conversation);
  }

  closeUserFinder();
  renderConversations(searchInput.value);
  openConversation(conversation.id);
}

function openUserProfile(user, options = {}) {
  const conversation = findConversationByUser(user) || createConversationFromUser(user);
  openFriendProfile(conversation, options);
}

function isAdminAccount(user = currentUser) {
  const name = String(user?.profile?.name || user?.name || "").trim().toLowerCase();
  const username = String(user?.profile?.username || user?.username || "").trim().toLowerCase();
  return name.startsWith(adminLoginAlias) || username.includes(adminLoginAlias);
}

function canMessageConversation(conversation) {
  if (!currentUser || !conversation) return false;
  if (conversation.blocked) return false;
  if (conversation.isGroup) return true;
  if (isAdminAccount()) return true;
  if (currentUser.profile?.restricted && conversation.number !== "0") return false;
  if (conversation.restricted) return false;
  return true;
}

function restrictedMessage(conversation) {
  if (conversation?.blockedByThem) {
    return "This user blocked you. You cannot message this user.";
  }
  if (conversation?.blockedByMe) {
    return "You blocked this user. Unblock to send messages.";
  }
  if (currentUser?.profile?.restricted && conversation?.number !== "0") {
    return "Your account is restricted. You can only message WebChat admin support right now.";
  }
  if (conversation?.restricted) {
    return "This account is currently restricted and cannot send or receive messages.";
  }
  return "Messaging is not available for this conversation.";
}

function renderUserSearchResult(user) {
  const existing = findConversationByUser(user);
  userSearchResult.innerHTML = "";
  userSearchResult.classList.add("active");

  const avatar = document.createElement("img");
  avatar.src = user.profile.avatar;
  avatar.alt = "";

  const text = document.createElement("span");
  const name = document.createElement("strong");
  setVerifiedName(name, user.profile.name, user.profile.verified);
  const number = document.createElement("span");
  number.textContent = user.number;
  text.append(name, number);

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = existing ? "Open" : "Add";
  action.addEventListener("click", (event) => {
    event.stopPropagation();
    addOrOpenUserChat(user);
  });

  userSearchResult.append(avatar, text, action);
  userSearchResult.onclick = () => openUserProfile(user);
}

async function searchUserByNumber() {
  const searchValue = sanitizeUserSearchValue(userSearchNumber.value);
  userSearchNumber.value = searchValue;
  const isUsernameSearch = searchValue.startsWith("@");
  const number = isUsernameSearch ? "" : normalizeBangladeshPhoneNumber(searchValue) || normalizePhoneNumber(searchValue);
  userSearchResult.classList.remove("active");
  userSearchResult.innerHTML = "";
  userSearchMessage.textContent = "";
  setAuthLoading(userSearchButton, true);

  try {
    if (!searchValue || (!isUsernameSearch && !number)) {
      userSearchMessage.textContent = "Number ba @username dao";
      return;
    }

    if (!isUsernameSearch && currentUser && number === normalizePhoneNumber(currentUser.number)) {
      userSearchMessage.textContent = "Eta tomar nijer account";
      return;
    }

    if (isUsernameSearch) {
      if (currentUser?.profile?.username?.toLowerCase() === searchValue) {
        userSearchMessage.textContent = "Eta tomar nijer account";
        return;
      }
      const usersSnapshot = await getDocs(query(collection(db, "users"), where("username", "==", searchValue)));
      const userDoc = usersSnapshot.docs[0];
      if (!userDoc) {
        userSearchMessage.textContent = "Ei username-er user pawa jay nai";
        return;
      }
      const user = normalizeUserDoc(userDoc.id, userDoc.data());
      renderUserSearchResult(user);
      return;
    }

    const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(number)));
    if (!numberSnapshot.exists()) {
      userSearchMessage.textContent = "No user found with this number.";
      return;
    }

    const user = await loadUserProfile(numberSnapshot.data().uid);
    renderUserSearchResult(user);
  } finally {
    setAuthLoading(userSearchButton, false);
    updateUserSearchButton();
  }
}

function visibleConversations() {
  return conversations.filter((conversation) => !conversation.archived);
}

async function setConversationArchiveState(conversation, archived) {
  conversation.archived = archived;
  if (conversation.chatId && firebaseUser) {
    await setDoc(doc(db, "chats", conversation.chatId), {
      archivedBy: {
        [firebaseUser.uid]: archived
      }
    }, { merge: true });
  }
}

async function setConversationBlockState(conversation, blocked) {
  conversation.blockedBy = {
    ...(conversation.blockedBy || {}),
    [firebaseUser.uid]: blocked
  };
  conversation.blockedByMe = blocked;
  conversation.blockedByThem = !!(conversation.userId && conversation.blockedBy?.[conversation.userId]);
  conversation.blocked = conversation.blockedByMe || conversation.blockedByThem;
  if (conversation.chatId && firebaseUser) {
    await setDoc(doc(db, "chats", conversation.chatId), {
      blockedBy: {
        [firebaseUser.uid]: blocked
      }
    }, { merge: true });
  }
}

function afterConversationHidden(conversation, options = {}) {
  closeConversationMenu();
  const visible = visibleConversations();
  if (!options.keepOpen && currentConversation?.id === conversation.id) {
    currentConversation = visible[0] || conversations[0];
    if (currentConversation) renderMessages();
  }
  renderConversations(searchInput.value);
}

async function deleteConversationForCurrentUser(conversation) {
  if (!conversation || !firebaseUser) return;
  const previousConversations = [...conversations];
  const previousCurrent = currentConversation;
  const index = conversations.findIndex((item) => item.id === conversation.id);
  if (index >= 0) conversations.splice(index, 1);
  if (conversation.chatId) {
    outgoingVisibleChats.delete(conversation.chatId);
    hideConversationLocally(firebaseUser.uid, conversation.chatId);
    pendingLocalClears.add(localMessagesKey(firebaseUser.uid, conversation.chatId));
    clearLocalMessages(firebaseUser.uid, conversation.chatId);
  }
  afterConversationHidden(conversation);

  if (!conversation.chatId) return;

  try {
    await setDoc(doc(db, "chats", conversation.chatId), {
      hiddenBy: {
        [firebaseUser.uid]: true
      },
      hiddenLastBy: {
        [firebaseUser.uid]: {
          text: "",
          senderId: "",
          time: ""
        }
      },
      [`unreadBy.${firebaseUser.uid}`]: 0,
      updatedAt: firestoreServerTimestamp()
    }, { merge: true });
    pendingLocalClears.delete(localMessagesKey(firebaseUser.uid, conversation.chatId));
  } catch (error) {
    pendingLocalClears.delete(localMessagesKey(firebaseUser.uid, conversation.chatId));
    conversations.splice(0, conversations.length, ...previousConversations);
    currentConversation = previousCurrent;
    renderConversations(searchInput.value);
    if (currentConversation) renderMessages();
    window.alert("Chat delete hoy nai. Firebase rules check koro.");
  }
}

function openSavedView(type) {
  closeHomeOptions();
  saveUiState({ view: "saved", type });
  savedOverlay.classList.add("active");
  savedOverlay.setAttribute("aria-hidden", "false");
  savedTitle.textContent = type === "archived" ? "Archived chats" : "Blocked users";
  renderSavedList(type);
  savedCloseButton.focus();
}

function closeSavedView() {
  savedOverlay.classList.remove("active");
  savedOverlay.setAttribute("aria-hidden", "true");
  saveUiState({ view: "home" });
  homeOptionsButton.focus();
}

function renderSavedList(type) {
  const key = type === "archived" ? "archived" : "blocked";
  const actionText = type === "archived" ? "Unarchive" : "Unblock";
  const items = conversations.filter((conversation) => conversation[key]);
  savedList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = type === "archived" ? "No archived chats" : "No blocked users";
    savedList.appendChild(empty);
    return;
  }

  items.forEach((conversation) => {
    const row = document.createElement("article");
    row.className = "saved-item";

    const avatar = document.createElement("img");
    avatar.src = conversation.avatar;
    avatar.alt = "";

    const text = document.createElement("span");
    const name = document.createElement("strong");
    setVerifiedName(name, conversation.name, conversation.verified);
    const preview = document.createElement("span");
    preview.textContent = latestMessage(conversation);
    text.append(name, preview);

    const action = document.createElement("button");
    action.type = "button";
    action.textContent = actionText;
    action.addEventListener("click", async () => {
      if (type === "archived") await setConversationArchiveState(conversation, false);
      else await setConversationBlockState(conversation, false);
      renderSavedList(type);
      renderConversations(searchInput.value);
      if (currentConversation?.id === conversation.id) renderMessages();
    });

    row.append(avatar, text, action);
    savedList.appendChild(row);
  });
}

async function getSignupCodeDocs() {
  const snapshot = await getDocs(collection(db, "signupCodes"));
  return snapshot.docs.map((codeDoc) => ({
    id: codeDoc.id,
    ...codeDoc.data()
  })).sort((a, b) => (a.createdOrder || 0) - (b.createdOrder || 0));
}

async function createSignupCodeDoc(order = Date.now()) {
  let code = generateSignupCode();
  let guard = 0;
  while ((await getDoc(doc(db, "signupCodes", code))).exists() && guard < 8) {
    code = generateSignupCode();
    guard += 1;
  }
  await setDoc(doc(db, "signupCodes", code), {
    code,
    used: false,
    usedAt: null,
    usedByNumber: "",
    createdAt: firestoreServerTimestamp(),
    createdOrder: order
  });
  return code;
}

async function ensureSignupCodes() {
  const codes = await getSignupCodeDocs();
  const missingCount = Math.max(0, 10 - codes.length);
  if (!missingCount) return codes.slice(0, 10);
  await Promise.all(Array.from({ length: missingCount }, (_, index) => {
    return createSignupCodeDoc(Date.now() + index);
  }));
  return getSignupCodeDocs();
}

async function renderAdminCodes() {
  adminCodesList.innerHTML = "";
  const codes = (await ensureSignupCodes()).slice(0, 10);
  const userNameByUid = new Map();
  await Promise.all(codes
    .filter((codeItem) => codeItem.usedByUid)
    .map(async (codeItem) => {
      try {
        const userSnapshot = await getDoc(doc(db, "users", codeItem.usedByUid));
        if (userSnapshot.exists()) {
          const user = normalizeUserDoc(userSnapshot.id, userSnapshot.data());
          userNameByUid.set(codeItem.usedByUid, user.profile.name || user.number || "");
        }
      } catch (error) {
        console.warn("Code user name load failed", error);
      }
    }));
  codes.forEach((codeItem) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `admin-code-row${codeItem.used ? " expired" : ""}`;

    const codeText = document.createElement("strong");
    codeText.textContent = codeItem.code || codeItem.id;
    const status = document.createElement("span");
    const usedByName = codeItem.usedByUid ? userNameByUid.get(codeItem.usedByUid) : "";
    const usedByLabel = usedByName || codeItem.usedByName || codeItem.usedByNumber || "";
    const expiredLabel = codeItem.useType === "passwordForget"
      ? `Password forget${usedByLabel ? ` - ${usedByLabel}` : ""}`
      : (usedByLabel ? `Used by ${usedByLabel}` : "Expired");
    status.textContent = codeItem.used ? expiredLabel : "Copy";
    row.append(codeText, status);

    row.addEventListener("click", async () => {
      const copied = await copyText(codeItem.code || codeItem.id);
      status.textContent = copied ? (codeItem.used ? `${expiredLabel} copied` : "Copied") : "Copy failed";
      window.setTimeout(() => {
        status.textContent = codeItem.used ? expiredLabel : "Copy";
      }, 900);
    });

    adminCodesList.appendChild(row);
  });
}

async function openAdminCodes() {
  adminUsersList.classList.add("hidden");
  adminCodesPanel.classList.add("active");
  adminCodesPanel.setAttribute("aria-hidden", "false");
  await renderAdminCodes();
}

function closeAdminCodes() {
  adminUsersList.classList.remove("hidden");
  adminCodesPanel.classList.remove("active");
  adminCodesPanel.setAttribute("aria-hidden", "true");
}

async function regenerateExpiredCodes() {
  generateCodesButton.disabled = true;
  const codes = await getSignupCodeDocs();
  const expiredCodes = codes.filter((codeItem) => codeItem.used);
  if (!expiredCodes.length) {
    await ensureSignupCodes();
    generateCodesButton.disabled = false;
    await renderAdminCodes();
    return;
  }
  await Promise.all(expiredCodes.map(async (codeItem, index) => {
    await deleteDoc(doc(db, "signupCodes", codeItem.id));
    await createSignupCodeDoc(codeItem.createdOrder || Date.now() + index);
  }));
  generateCodesButton.disabled = false;
  await renderAdminCodes();
}

async function openAdminUsers() {
  if (!isAdminAccount()) return;
  saveUiState({ view: "adminUsers" });
  adminUsersList.innerHTML = "";
  closeAdminCodes();
  adminUsersOverlay.classList.add("active");
  adminUsersOverlay.setAttribute("aria-hidden", "false");

  const codesRow = document.createElement("button");
  codesRow.type = "button";
  codesRow.className = "admin-codes-entry";
  codesRow.textContent = "Verification codes";
  codesRow.addEventListener("click", openAdminCodes);
  adminUsersList.appendChild(codesRow);

  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.docs.forEach((userDoc) => {
    const userData = userDoc.data();
    const user = normalizeUserDoc(userDoc.id, userData);
    if (user.uid === firebaseUser.uid) return;

    const row = document.createElement("article");
    row.className = "saved-item";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.addEventListener("click", (event) => {
      if (longPressTriggered) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      openUserProfile(user, { fromAdminUsers: true });
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openUserProfile(user, { fromAdminUsers: true });
    });
    row.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      longPressTriggered = false;
      window.clearTimeout(conversationHoldTimer);
      conversationHoldTimer = window.setTimeout(() => {
        longPressTriggered = true;
        openAdminUserMenu(row, user);
      }, 520);
    });
    row.addEventListener("pointerup", () => window.clearTimeout(conversationHoldTimer));
    row.addEventListener("pointerleave", () => window.clearTimeout(conversationHoldTimer));
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openAdminUserMenu(row, user);
    });

    const avatar = document.createElement("img");
    avatar.src = user.profile.avatar;
    avatar.alt = "";

    const text = document.createElement("span");
    const name = document.createElement("strong");
    setVerifiedName(name, user.profile.name, user.profile.verified);
    const number = document.createElement("span");
    number.textContent = user.profile.restricted ? `${user.number} - Restricted` : user.number;
    text.append(name, number);

    const action = document.createElement("button");
    action.type = "button";
    action.textContent = "Chat";
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      closeAdminUsers();
      addOrOpenUserChat(user);
    });

    row.append(avatar, text, action);
    adminUsersList.appendChild(row);
  });
}

function closeAdminUsers() {
  if (adminCodesPanel.classList.contains("active")) {
    closeAdminCodes();
    return;
  }
  adminUsersOverlay.classList.remove("active");
  adminUsersOverlay.setAttribute("aria-hidden", "true");
  closeAdminCodes();
  closeConversationMenu();
  saveUiState({ view: "home" });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function signalUserDeletion(uid) {
  if (!uid) return;
  await set(ref(realtimeDb, `activeSessions/${uid}`), {
    sessionId: `deleted-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    deleted: true,
    updatedAt: databaseServerTimestamp()
  }).catch((error) => console.warn("Delete logout signal failed", error));
  await set(ref(realtimeDb, `status/${uid}`), null).catch((error) => console.warn("Delete status cleanup failed", error));
  await wait(700);
}

async function deleteFirebaseUserData(user) {
  if (!user?.uid) return;
  await signalUserDeletion(user.uid);
  const cleanNumber = normalizePhoneNumber(user.number);

  const chatsSnapshot = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", user.uid)));
  await Promise.all(chatsSnapshot.docs.map(async (chatDoc) => {
    const messagesSnapshot = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    await Promise.all(messagesSnapshot.docs.map((messageDoc) => deleteDoc(doc(db, "chats", chatDoc.id, "messages", messageDoc.id))));
    await deleteDoc(doc(db, "chats", chatDoc.id));
  }));

  const codeSnapshots = await Promise.all([
    getDocs(query(collection(db, "signupCodes"), where("usedByUid", "==", user.uid))).catch(() => ({ docs: [] })),
    cleanNumber ? getDocs(query(collection(db, "signupCodes"), where("usedByNumber", "==", cleanNumber))).catch(() => ({ docs: [] })) : { docs: [] }
  ]);
  const codeIds = new Set();
  codeSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((codeDoc) => codeIds.add(codeDoc.id));
  });
  await Promise.all([...codeIds].map((codeId) => deleteDoc(doc(db, "signupCodes", codeId))));

  const requestSnapshots = await Promise.all([
    getDocs(query(collection(db, "verificationRequests"), where("uid", "==", user.uid))).catch(() => ({ docs: [] })),
    cleanNumber ? getDocs(query(collection(db, "verificationRequests"), where("number", "==", cleanNumber))).catch(() => ({ docs: [] })) : { docs: [] }
  ]);
  const requestIds = new Set();
  requestSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((requestDoc) => requestIds.add(requestDoc.id));
  });
  await Promise.all([...requestIds].map((requestId) => deleteDoc(doc(db, "verificationRequests", requestId))));

  await set(ref(realtimeDb, `activeSessions/${user.uid}`), null).catch(() => {});
  await set(ref(realtimeDb, `status/${user.uid}`), null).catch(() => {});
  if (cleanNumber) {
    await deleteDoc(doc(db, "numbers", numberDocId(cleanNumber)));
  }
  await deleteDoc(doc(db, "users", user.uid));
}

async function deleteAdminUser(user) {
  if (!isAdminAccount() || user.uid === firebaseUser?.uid) return;
  const ok = window.confirm(`Delete ${user.profile.name}? This removes the user profile and chat records from Firestore.`);
  if (!ok) return;

  try {
    await deleteFirebaseUserData(user);
    conversations.filter((conversation) => conversation.userId === user.uid).forEach((conversation) => {
      clearLocalMessages(firebaseUser.uid, conversation.chatId);
    });
    conversations.splice(0, conversations.length, ...conversations.filter((conversation) => conversation.userId !== user.uid));
    await openAdminUsers();
    renderConversations(searchInput.value);
  } catch (error) {
    window.alert("User delete hoy nai. Firebase rules check koro.");
  }
}

async function toggleAdminRestriction(user) {
  const restricted = !user.profile.restricted;
  await updateDoc(doc(db, "users", user.uid), {
    restricted,
    updatedAt: firestoreServerTimestamp()
  });
  await openAdminUsers();
}

function changeAdminUserPassword(user) {
  if (!isAdminAccount() || !user?.uid) return;
  if (activeConfirmDialog) activeConfirmDialog.remove();
  closeConversationMenu();
  confirmOpenedAt = Date.now();

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active";
  overlay.setAttribute("aria-hidden", "false");

  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog password-reset-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Change password";

  const newInput = document.createElement("input");
  newInput.type = "password";
  newInput.placeholder = "New password";
  newInput.autocomplete = "new-password";

  const confirmInput = document.createElement("input");
  confirmInput.type = "password";
  confirmInput.placeholder = "Confirm password";
  confirmInput.autocomplete = "new-password";

  const message = document.createElement("p");
  message.className = "reset-message";

  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";

  const close = () => {
    overlay.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
  };

  cancelButton.addEventListener("click", close);
  saveButton.addEventListener("click", async () => {
    message.textContent = "";
    saveButton.disabled = true;
    try {
      await changeUserPasswordAsAdmin(user, newInput.value, confirmInput.value);
      close();
      window.alert("Password changed");
      if (activeFriendProfile) openFriendProfile(activeFriendProfile);
      renderConversations(searchInput.value);
      renderProfileFriends();
    } catch (error) {
      message.textContent = error.message || "Password change hoy nai";
      saveButton.disabled = false;
    }
  });

  actions.append(cancelButton, saveButton);
  dialog.append(
    heading,
    createResetField("New password", createPasswordField(newInput)),
    createResetField("Confirm password", createPasswordField(confirmInput)),
    message,
    actions
  );
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
  activeConfirmDialog = overlay;
  newInput.focus();
}

function openAdminUserMenu(anchor, user) {
  closeConversationMenu();
  menuOpenedAt = Date.now();
  const menu = document.createElement("div");
  menu.className = "conversation-action-menu admin-action-menu centered-menu active";
  menu.addEventListener("click", (event) => {
    if (Date.now() - menuOpenedAt < 450) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
  });
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());

  const passwordButton = document.createElement("button");
  passwordButton.type = "button";
  passwordButton.textContent = "Change password";
  passwordButton.addEventListener("click", () => {
    closeConversationMenu();
    changeAdminUserPassword(user);
  });

  const restrictButton = document.createElement("button");
  restrictButton.type = "button";
  restrictButton.textContent = user.profile.restricted ? "Unrestrict" : "Restrict";
  restrictButton.addEventListener("click", () => {
    closeConversationMenu();
    toggleAdminRestriction(user);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete user";
  deleteButton.addEventListener("click", () => {
    closeConversationMenu();
    deleteAdminUser(user);
  });

  menu.append(passwordButton, restrictButton, deleteButton);
  phoneShell.appendChild(menu);
  activeConversationMenu = menu;
  activeConversationMenuAnchor = anchor;
}

function getMessageTimeMs(message) {
  return message?.createdAtMs || message?.localOrder || 0;
}

function formatClockTime(timeMs) {
  if (!timeMs) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(timeMs));
}

function formatCalendarDate(timeMs) {
  if (!timeMs) return "";
  const options = {
    month: "short",
    day: "numeric"
  };
  if (new Date(timeMs).getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat("en-US", options).format(new Date(timeMs));
}

function formatWeekday(timeMs) {
  if (!timeMs) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(timeMs));
}

function isSameCalendarDay(firstTime, secondTime) {
  if (!firstTime || !secondTime) return false;
  const first = new Date(firstTime);
  const second = new Date(secondTime);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function messageDividerLabel(message, previousTimeMs) {
  const timeMs = getMessageTimeMs(message);
  if (!timeMs) return previousTimeMs ? "" : (message.date || "Today");
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const messageStart = new Date(timeMs);
  messageStart.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((todayStart.getTime() - messageStart.getTime()) / (24 * 60 * 60 * 1000));
  const oneHour = 60 * 60 * 1000;

  if (!previousTimeMs) {
    if (isSameCalendarDay(timeMs, now)) return "Today";
    if (dayDiff === 1) return "Yesterday";
    return dayDiff < 7 ? formatWeekday(timeMs) : formatCalendarDate(timeMs);
  }
  if (timeMs - previousTimeMs < oneHour && isSameCalendarDay(timeMs, previousTimeMs)) return "";
  if (isSameCalendarDay(timeMs, previousTimeMs)) return formatClockTime(timeMs);
  if (dayDiff === 1) return "Yesterday";
  return dayDiff < 7 ? formatWeekday(timeMs) : formatCalendarDate(timeMs);
}

function fullMessageTimeLabel(message) {
  const timeMs = getMessageTimeMs(message);
  if (timeMs) {
    return formatClockTime(timeMs);
  }
  return message.time || "Now";
}

function createChatProfileIntro() {
  const intro = document.createElement("button");
  intro.type = "button";
  intro.className = "chat-profile-intro";
  intro.addEventListener("click", openCurrentChatProfile);

  const image = document.createElement("img");
  image.src = currentConversation.avatar || defaultAvatar;
  image.alt = "";

  const name = document.createElement("strong");
  name.textContent = currentConversation.name;

  const status = document.createElement("span");
  status.textContent = currentConversation.isGroup ? currentConversation.status : "Profile";

  intro.append(image, name, status);
  return intro;
}

function renderMessages() {
  if (!currentConversation) return;
  refreshGroupRequestBadge();
  chatName.textContent = "";
  chatName.appendChild(document.createTextNode(currentConversation.name));
  if (currentConversation.verified) chatName.appendChild(createVerifiedBadge());
  if (currentConversation.muted) {
    const muteIcon = document.createElement("span");
    muteIcon.className = "mute-icon";
    muteIcon.setAttribute("aria-label", "Muted");
    muteIcon.appendChild(createSvgIcon(iconPaths.muted, "mute-icon-svg"));
    chatName.appendChild(muteIcon);
  }
  chatStatus.textContent = currentConversation.muted ? "Muted" : currentConversation.status;
  muteChatButton.textContent = currentConversation.muted ? "Unmute" : "Mute";
  chatAvatar.src = currentConversation.avatar;
  chatAvatar.alt = currentConversation.name;
  chatAvatarWrap.classList.toggle("active", currentConversation.status === "Active now");
  chatAvatarWrap.classList.remove("offline");
  messageForm.classList.toggle("blocked", !!currentConversation.blocked);
  if (blockedComposer) blockedComposer.hidden = !currentConversation.blocked;
  if (blockedComposerText && currentConversation.blocked) {
    blockedComposerText.textContent = currentConversation.blockedByThem
      ? "You are blocked."
      : "This chat is blocked.";
  }
  if (blockedComposerUnblock) blockedComposerUnblock.hidden = !currentConversation.blockedByMe;

  if (currentConversation.chatId && !currentConversation.messagesLoaded) {
    messages.innerHTML = `<div class="messages-state">Loading chat...</div>`;
    updateJumpBottomButton();
    return;
  }

  const previousScrollTop = messages.scrollTop;
  const shouldStickToBottom = forceMessagesScrollBottom || isMessagesNearBottom() || messages.children.length <= 1;
  forceMessagesScrollBottom = false;
  const reusableVoiceRows = new Map([...messages.querySelectorAll(".message-row.voice-row[data-message-id]")].map((row) => {
    return [row.dataset.messageId, row];
  }));

  messages.replaceChildren();
  messages.appendChild(createChatProfileIntro());
  if (!currentConversation.messages.length) {
    updateJumpBottomButton();
    return;
  }
  const lastOwnMessage = [...currentConversation.messages].reverse().find((message) => message.from === "me");
  applySeenState(currentConversation);
  applyDeliveryState(currentConversation);
  const lastSeenOwnMessage = [...currentConversation.messages].reverse().find((message) => {
    return message.from === "me" && message.status === "seen";
  });

  let previousMessageTime = 0;
  currentConversation.messages.forEach((message) => {
    const messageTimeMs = getMessageTimeMs(message);
    const dividerLabel = messageDividerLabel(message, previousMessageTime);
    if (dividerLabel) {
      const divider = document.createElement("div");
      divider.className = "time-divider";
      divider.textContent = dividerLabel;
      messages.appendChild(divider);
    }
    previousMessageTime = messageTimeMs || previousMessageTime;

    const reusableRow = message.type === "voice" ? reusableVoiceRows.get(message.id) : null;
    if (reusableRow) {
      reusableRow.className = `message-row ${message.from} voice-row`;
      reusableRow.classList.toggle("show-time", message.id === activeMessageTimeId);
      messages.appendChild(reusableRow);
      return;
    }
    const row = document.createElement("div");
    row.className = `message-row ${message.from}`;
    row.dataset.messageId = message.id;
    if (message.type === "voice") row.classList.add("voice-row");
    if (message.from === "them") {
      const senderProfile = currentConversation.isGroup ? memberProfileForMessage(message) : currentConversation;
      const avatar = document.createElement("img");
      avatar.className = "message-avatar";
      avatar.src = senderProfile.avatar || defaultAvatar;
      avatar.alt = senderProfile.name || "";
      avatar.addEventListener("click", (event) => {
        event.stopPropagation();
        openFriendProfile(currentConversation.isGroup
          ? conversationForMemberProfile(message.senderId, senderProfile)
          : currentConversation);
      });
      row.appendChild(avatar);
    }
    const bubble = document.createElement("p");
    bubble.className = "message";
    appendReplyQuote(bubble, message.replyTo);
    if (message.type === "photo" && message.url) {
      bubble.classList.add("photo-message");
      const icon = document.createElement("span");
      icon.className = "photo-file-icon";
      icon.appendChild(createSvgIcon(iconPaths.photo, "photo-file-svg"));
      const details = document.createElement("span");
      details.className = "photo-file-details";
      const title = document.createElement("strong");
      title.textContent = "Photo";
      const fileName = document.createElement("small");
      fileName.textContent = message.fileName || "Tap to view";
      details.append(title, fileName);
      bubble.append(icon, details);
    } else if (message.type === "voice" && message.url) {
      bubble.classList.add("voice-message");
      const voice = createVoiceBubble(message);
      bubble.append(voice.play, voice.wave, voice.duration, voice.audio);
    } else {
      appendSmartText(bubble, message.text);
    }
    if (message.reaction === "heart") {
      const reaction = document.createElement("span");
      reaction.className = "message-reaction";
      reaction.textContent = "\u2764\ufe0f";
      bubble.appendChild(reaction);
    }
    bubble.addEventListener("click", (event) => {
      event.stopPropagation();
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
      closeMessageActions();
      if (message.type === "voice") {
        const audio = bubble.querySelector("audio");
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      if (message.type === "photo" && message.url) {
        openPhotoViewer(message);
        return;
      }
      activeMessageTimeId = activeMessageTimeId === message.id ? null : message.id;
      renderMessages();
    });
    bubble.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextReaction = message.reaction === "heart" ? "" : "heart";
      setLocalMessageReaction(currentConversation, message, nextReaction);
      if (currentConversation?.chatId) {
        writeLocalMessages(firebaseUser.uid, currentConversation.chatId, currentConversation.messages);
      }
      renderMessages();
      syncMessageReaction(currentConversation, message, nextReaction);
    });
    bubble.addEventListener("pointerdown", (event) => {
      startReplySwipe(event, row, message);
      startLongPress(row, message);
    });
    bubble.addEventListener("pointermove", moveReplySwipe);
    bubble.addEventListener("pointerup", (event) => {
      if (!finishReplySwipe(event)) cancelLongPress();
    });
    bubble.addEventListener("pointerleave", () => {
      if (replySwipeStart?.row === row) {
        row.classList.remove("reply-swiping");
        row.style.transform = "";
        replySwipeStart.pointerTarget?.releasePointerCapture?.(replySwipeStart.pointerId);
        replySwipeStart = null;
      }
      cancelLongPress();
    });
    bubble.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openMessageActions(row, message);
    });
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = fullMessageTimeLabel(message);
    row.classList.toggle("show-time", message.id === activeMessageTimeId);
    row.appendChild(bubble);
    const isLastSeen = message.id === lastSeenOwnMessage?.id;
    const isLastPending = message.id === lastOwnMessage?.id && message.status !== "seen";
    if (message.from === "me" && (isLastSeen || isLastPending)) {
      row.appendChild(createMessageStatus(message));
    }
    row.appendChild(time);
    messages.appendChild(row);
  });

  if (shouldStickToBottom) {
    scrollMessagesToBottom();
  } else {
    messages.scrollTop = previousScrollTop;
    updateJumpBottomButton();
  }
}

function openPhotoViewer(message) {
  document.querySelector(".photo-viewer-overlay")?.remove();

  const overlay = document.createElement("section");
  overlay.className = "photo-viewer-overlay active";
  overlay.setAttribute("aria-hidden", "false");

  const panel = document.createElement("article");
  panel.className = "photo-viewer";

  const image = document.createElement("img");
  image.src = message.url;
  image.alt = message.fileName || "Photo";

  const actions = document.createElement("div");
  actions.className = "photo-viewer-actions";

  const saveLink = document.createElement("a");
  saveLink.href = message.url;
  saveLink.download = message.fileName || `webchat-photo-${Date.now()}.jpg`;
  saveLink.textContent = "Save";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";

  const close = () => overlay.remove();
  overlay.addEventListener("click", close);
  panel.addEventListener("click", (event) => event.stopPropagation());
  closeButton.addEventListener("click", close);

  actions.append(saveLink, closeButton);
  panel.append(image, actions);
  overlay.appendChild(panel);
  phoneShell.appendChild(overlay);
}

function createVoiceBubble(message) {
  const play = document.createElement("span");
  play.className = "voice-play";
  play.textContent = "\u25b6";

  const wave = document.createElement("span");
  wave.className = "voice-wave";
  for (let index = 0; index < 18; index += 1) {
    const bar = document.createElement("span");
    bar.style.setProperty("--bar", String((index % 5) + 1));
    wave.appendChild(bar);
  }

  const duration = document.createElement("small");
  duration.className = "voice-duration";
  duration.textContent = message.fileName?.replace(/^Voice\s*/i, "") || "0:00";

  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.src = message.url;
  audio.addEventListener("play", () => {
    play.textContent = "\u275a\u275a";
    wave.classList.add("playing");
  });
  audio.addEventListener("pause", () => {
    play.textContent = "\u25b6";
    wave.classList.remove("playing");
  });
  audio.addEventListener("ended", () => {
    play.textContent = "\u25b6";
    wave.classList.remove("playing");
  });

  return { play, wave, duration, audio };
}

function createMessageStatus(message) {
  const status = document.createElement("span");
  status.className = `message-status ${message.status || "sent"}`;

  if (message.status === "pending") {
    status.textContent = "Pending";
  } else if (message.status === "seen") {
    if (currentConversation?.isGroup && message.seenByMembers?.length) {
      message.seenByMembers.slice(0, 4).forEach((uid) => {
        const profile = getCachedMemberProfile(uid);
        if (!profile) requestMemberProfile(uid);
        const image = document.createElement("img");
        image.src = profile?.avatar || defaultAvatar;
        image.alt = profile?.name || "Seen";
        status.appendChild(image);
      });
    } else {
      const image = document.createElement("img");
      image.src = currentConversation.avatar;
      image.alt = "Seen";
      status.appendChild(image);
    }
  } else {
    const tickCount = message.status === "delivered" ? 2 : 1;
    for (let index = 0; index < tickCount; index += 1) {
      const tick = document.createElement("span");
      tick.className = "tick";
      status.appendChild(tick);
    }
  }

  return status;
}

function isMessagesNearBottom(offset = 90) {
  return messages.scrollHeight - messages.scrollTop - messages.clientHeight < offset;
}

function updateJumpBottomButton() {
  if (!jumpBottomButton) return;
  const canScroll = messages.scrollHeight > messages.clientHeight + 12;
  const visible = !!currentConversation && canScroll && !isMessagesNearBottom(140);
  jumpBottomButton.classList.toggle("visible", visible);
  jumpBottomButton.classList.toggle("has-count", jumpBottomUnread > 0);
  if (jumpBottomCount) {
    jumpBottomCount.textContent = jumpBottomUnread > 99 ? "99+" : (jumpBottomUnread ? String(jumpBottomUnread) : "");
  }
}

function scrollMessagesToBottom() {
  jumpBottomUnread = 0;
  messages.scrollTop = messages.scrollHeight;
  updateJumpBottomButton();
}

function appendSmartText(container, text) {
  const value = String(text || "");
  const tokenPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;
  value.replace(tokenPattern, (token, _match, offset) => {
    if (offset > lastIndex) container.appendChild(document.createTextNode(value.slice(lastIndex, offset)));
    if (/^(https?:\/\/|www\.)/i.test(token)) {
      const link = document.createElement("a");
      link.href = token.startsWith("www.") ? `https://${token}` : token;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = token;
      link.addEventListener("click", (event) => event.stopPropagation());
      container.appendChild(link);
    }
    lastIndex = offset + token.length;
    return token;
  });
  if (lastIndex < value.length) container.appendChild(document.createTextNode(value.slice(lastIndex)));
}

function appendReplyQuote(bubble, replyTo) {
  if (!replyTo) return;
  const quote = document.createElement("button");
  quote.type = "button";
  quote.className = "message-reply-quote";
  quote.dataset.replyTargetId = replyTo.id || "";
  const name = document.createElement("strong");
  name.textContent = replyTo.name || (replyTo.from === "me" ? "You" : "User");
  const text = document.createElement("small");
  text.textContent = replyTo.text || "";
  quote.append(name, text);
  quote.addEventListener("click", (event) => {
    event.stopPropagation();
    jumpToReplyTarget(replyTo.id);
  });
  bubble.appendChild(quote);
}

function jumpToReplyTarget(messageId) {
  if (!messageId) return;
  const target = messages.querySelector(`.message-row[data-message-id="${CSS.escape(messageId)}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("reply-target-highlight");
  void target.offsetWidth;
  target.classList.add("reply-target-highlight");
  window.setTimeout(() => target.classList.remove("reply-target-highlight"), 1500);
}

function startReplySwipe(event, row, message) {
  if (event.button && event.button !== 0) return;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  replySwipeStart = {
    id: message.id,
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    pointerTarget: event.currentTarget,
    row,
    message,
    active: false
  };
}

function moveReplySwipe(event) {
  if (!replySwipeStart) return;
  const dx = event.clientX - replySwipeStart.x;
  const dy = event.clientY - replySwipeStart.y;
  const allowedDirection = replySwipeStart.message.from === "me" ? -1 : 1;
  const directionalDx = dx * allowedDirection;
  if (!replySwipeStart.active && Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx) * 1.35) {
    replySwipeStart.row.style.transform = "";
    replySwipeStart.pointerTarget?.releasePointerCapture?.(replySwipeStart.pointerId);
    replySwipeStart = null;
    return;
  }
  if (directionalDx < -6 && !replySwipeStart.active) return;
  const distance = allowedDirection * Math.min(56, Math.max(0, directionalDx));
  if (Math.abs(distance) > 7 || replySwipeStart.active) {
    replySwipeStart.active = true;
    cancelLongPress();
    replySwipeStart.row.classList.add("reply-swiping");
    replySwipeStart.row.style.transform = `translateX(${distance}px)`;
  }
}

function finishReplySwipe(event) {
  if (!replySwipeStart) return false;
  const swipe = replySwipeStart;
  replySwipeStart = null;
  const dx = event.clientX - swipe.x;
  const allowedDirection = swipe.message.from === "me" ? -1 : 1;
  const directionalDx = dx * allowedDirection;
  swipe.row.classList.remove("reply-swiping");
  swipe.row.style.transform = "";
  swipe.pointerTarget?.releasePointerCapture?.(swipe.pointerId);
  if (swipe.active && directionalDx > 36) {
    event.preventDefault();
    event.stopPropagation();
    longPressTriggered = true;
    setReplyMessage(swipe.message);
    return true;
  }
  return false;
}

function openConversation(id, allowSeen = true) {
  startOnHomeAfterLogin = false;
  jumpBottomUnread = 0;
  clearReplyMessage();
  currentConversation = conversations.find((conversation) => conversation.id === id) || conversations[0];
  if (!currentConversation) return;
  suppressConversationRenderUntil = Date.now() + 700;
  if (!desktopQuery.matches && !handlingHistoryPop && !chatHistoryActive) {
    history.pushState({ webchatView: "chat", conversationId: currentConversation.id }, "", window.location.href);
    chatHistoryActive = true;
  }
  saveUiState({
    view: "chat",
    conversationId: currentConversation.id,
    chatId: currentConversation.chatId,
    userId: currentConversation.userId,
    number: currentConversation.number
  });
  seenAllowedChatId = allowSeen ? currentConversation.chatId : null;
  closeMessageActions();
  hydrateConversationFromLocalCache(currentConversation);
  if (!currentConversation.messagesLoaded) messages.innerHTML = "";
  currentConversation.unread = 0;
  setConversationUnread(currentConversation, 0).catch(() => {});
  if (currentConversation.chatId) {
    lastNotificationKeys.set(currentConversation.chatId, `${currentConversation.lastSenderId || ""}|${currentConversation.lastMessage || ""}`);
  }
  phoneShell.classList.add("chat-open");
  if (!desktopQuery.matches) {
    homeScreen.classList.remove("active");
  }
  chatScreen.classList.add("active");
  updateChatEmptyState();
  subscribeToMessages(currentConversation);
  subscribeToPresence(currentConversation);
  renderMessages();
  refreshConversationRowsState();
  if (desktopQuery.matches) {
    messageInput.focus();
  }
}

function clearDesktopConversationSelection() {
  if (!desktopQuery.matches || !currentConversation) return;
  jumpBottomUnread = 0;
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePresence) unsubscribePresence();
  window.clearTimeout(presenceRefreshTimer);
  unsubscribeMessages = null;
  unsubscribePresence = null;
  activeMessageChatId = null;
  activePresenceUserId = null;
  seenAllowedChatId = null;
  presenceRefreshTimer = null;
  currentConversation = null;
  messages.innerHTML = "";
  chatName.textContent = "";
  chatStatus.textContent = "";
  chatAvatar.removeAttribute("src");
  chatAvatar.alt = "";
  chatAvatarWrap.classList.remove("active", "offline");
  updateChatEmptyState();
  updateJumpBottomButton();
  saveUiState({ view: "home" });
  renderConversations(searchInput.value);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function closeConversation(fromHistory = false) {
  if (desktopQuery.matches) return;
  if (!fromHistory && chatHistoryActive) {
    history.back();
    return;
  }
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePresence) unsubscribePresence();
  jumpBottomUnread = 0;
  clearReplyMessage();
  window.clearTimeout(presenceRefreshTimer);
  unsubscribeMessages = null;
  unsubscribePresence = null;
  activeMessageChatId = null;
  activePresenceUserId = null;
  seenAllowedChatId = null;
  presenceRefreshTimer = null;
  chatHistoryActive = false;
  phoneShell.classList.remove("chat-open");
  chatScreen.classList.remove("active");
  homeScreen.classList.add("active");
  currentConversation = null;
  updateChatEmptyState();
  updateJumpBottomButton();
  saveUiState({ view: "home" });
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function ensureAppBackTrap() {
  if (desktopQuery.matches || appBackTrapReady) return;
  appBackTrapReady = true;
  try {
    history.replaceState({ webchatApp: true, view: "home" }, "", window.location.href);
    history.pushState({ webchatApp: true, view: "guard" }, "", window.location.href);
  } catch (error) {
    console.warn("Back guard setup failed", error);
  }
}

function pushAppBackTrap() {
  if (desktopQuery.matches || !appBackTrapReady || allowBrowserBackExit) return;
  try {
    history.pushState({ webchatApp: true, view: "guard" }, "", window.location.href);
  } catch (error) {
    console.warn("Back guard push failed", error);
  }
}

function resetHomeBackPrompt() {
  homeBackPrimed = false;
  window.clearTimeout(homeBackPrimeTimer);
  homeBackPrimeTimer = null;
}

function closeTopLayerFromBack() {
  if (activeConfirmDialog) {
    activeConfirmDialog.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
    return true;
  }
  const photoViewer = document.querySelector(".photo-viewer-overlay");
  if (photoViewer) {
    photoViewer.remove();
    return true;
  }
  if (document.querySelector(".message-actions.active")) {
    closeMessageActions();
    return true;
  }
  if (activeConversationMenu) {
    closeConversationMenu();
    return true;
  }
  if (attachmentMenu?.classList.contains("active")) {
    closeAttachmentMenu();
    return true;
  }
  if (emojiMenu?.classList.contains("active")) {
    closeEmojiMenu();
    return true;
  }
  if (chatOptionsMenu?.classList.contains("active")) {
    closeChatOptions();
    return true;
  }
  if (homeOptionsMenu?.classList.contains("active")) {
    closeHomeOptions();
    return true;
  }
  if (userFinderPanel?.classList.contains("active")) {
    closeUserFinder();
    return true;
  }
  if (friendProfileOverlay.classList.contains("active")) {
    closeFriendProfile();
    return true;
  }
  if (friendsOverlay.classList.contains("active")) {
    closeAllFriends();
    return true;
  }
  if (profileOverlay.classList.contains("active")) {
    closeProfile();
    return true;
  }
  if (savedOverlay.classList.contains("active")) {
    closeSavedView();
    return true;
  }
  if (adminUsersOverlay.classList.contains("active")) {
    closeAdminUsers();
    return true;
  }
  if (phoneShell.classList.contains("chat-open")) {
    handlingHistoryPop = true;
    closeConversation(true);
    handlingHistoryPop = false;
    return true;
  }
  return false;
}

async function handlePhoneBackNavigation() {
  if (desktopQuery.matches || authScreen.classList.contains("active")) return;
  if (closeTopLayerFromBack()) {
    resetHomeBackPrompt();
    return;
  }

  if (!homeScreen.classList.contains("active")) return;

  if (!homeBackPrimed) {
    homeBackPrimed = true;
    window.clearTimeout(homeBackPrimeTimer);
    homeBackPrimeTimer = window.setTimeout(() => {
      homeBackPrimed = false;
      homeBackPrimeTimer = null;
    }, 1800);
    return;
  }

  resetHomeBackPrompt();
  const ok = await showConfirmDialog({
    title: "Exit WebChat?",
    message: "App theke ber hote chao?",
    confirmText: "Exit",
    danger: true
  });
  if (!ok) return;
  allowBrowserBackExit = true;
  history.back();
}

function getFriendProfile(conversation) {
  return {
    name: conversation.name,
    status: conversation.status,
    avatar: conversation.avatar,
    bio: conversation.bio || "",
    username: conversation.username || `@${conversation.id}.webchat`,
    number: conversation.number || "+880 1700-000000",
    verified: !!conversation.verified,
    editable: false
  };
}

function cacheMemberProfile(uid, profile = {}) {
  if (!uid) return;
  memberProfileCache.set(uid, {
    uid,
    name: profile.name || profile.profile?.name || "Member",
    avatar: profile.avatar || profile.profile?.avatar || defaultAvatar,
    number: profile.number || profile.profile?.number || "",
    username: profile.username || profile.profile?.username || `@${profile.number || uid}.webchat`,
    bio: profile.bio || profile.profile?.bio || "",
    verified: !!(profile.verified || profile.profile?.verified)
  });
}

function getCachedMemberProfile(uid) {
  if (!uid) return null;
  if (uid === firebaseUser?.uid) {
    cacheMemberProfile(uid, myProfile);
  }
  const existing = conversations.find((item) => item.userId === uid);
  if (existing) cacheMemberProfile(uid, existing);
  return memberProfileCache.get(uid) || null;
}

function requestMemberProfile(uid) {
  if (!uid || memberProfileCache.has(uid) || memberProfileLoadRequests.has(uid)) return;
  memberProfileLoadRequests.add(uid);
  getDoc(doc(db, "users", uid))
    .then((snapshot) => {
      if (!snapshot.exists()) return;
      const user = normalizeUserDoc(uid, snapshot.data());
      cacheMemberProfile(uid, user.profile);
      if (currentConversation?.isGroup) renderMessages();
    })
    .catch(() => {})
    .finally(() => memberProfileLoadRequests.delete(uid));
}

function memberProfileForMessage(message) {
  const uid = message?.senderId;
  const direct = {
    name: message?.senderName,
    avatar: message?.senderAvatar
  };
  if (direct.name || direct.avatar) {
    cacheMemberProfile(uid, direct);
  }
  const cached = getCachedMemberProfile(uid);
  if (!cached) requestMemberProfile(uid);
  return cached || { uid, name: direct.name || "Member", avatar: direct.avatar || defaultAvatar };
}

function conversationForMemberProfile(uid, fallback = {}) {
  const existing = conversations.find((item) => item.userId === uid);
  if (existing) return existing;
  const cached = getCachedMemberProfile(uid) || fallback;
  return {
    id: `member-${uid}`,
    userId: uid,
    name: cached.name || "Member",
    status: "",
    avatar: cached.avatar || defaultAvatar,
    bio: cached.bio || "",
    username: cached.username || `@${cached.number || uid}.webchat`,
    number: cached.number || "",
    verified: !!cached.verified,
    messages: []
  };
}

function isGroupConversation(conversation, profile = null) {
  return !!(
    conversation?.isGroup ||
    conversation?.type === "group" ||
    conversation?.groupName ||
    conversation?.bio === "Group chat" ||
    conversation?.username === "@group.webchat" ||
    profile?.bio === "Group chat" ||
    profile?.username === "@group.webchat" ||
    conversation?.participants?.length ||
    conversation?.memberIds?.length
  );
}

function openProfile(profile = myProfile) {
  activeProfile = profile;
  if (profile === myProfile) saveUiState({ view: "profile" });
  setImageAfterLoad(profilePhoto, profile.avatar || defaultAvatar, profile.name || "Profile");
  setVerifiedName(profileName, profile.name || "", profile.verified);
  profileStatus.textContent = "";
  document.querySelector("#profileBio").textContent = profile.bio || "";
  document.querySelector("#profileUsername").textContent = profile.username || "";
  document.querySelector("#profileNumber").textContent = profile.number || "";
  profilePhotoButton.classList.toggle("hidden", !profile.editable);
  profileNameButton.classList.toggle("hidden", !profile.editable);
  profileEditButton.classList.toggle("hidden", !profile.editable);
  profilePanel.classList.remove("details-editing");
  profileEditButton.textContent = "Edit";
  renderProfileFriends();
  profileOverlay.classList.add("active");
  profileOverlay.setAttribute("aria-hidden", "false");
  profileCloseButton.focus();
}

function renderProfileFriends() {
  const friends = conversations.filter((conversation) => !conversation.blocked);
  profileFriendCount.textContent = `${friends.length} friends`;
  profileFriendList.innerHTML = "";

  friends.slice(0, 4).forEach((friend) => {
    const row = document.createElement("button");
    row.className = "profile-friend";
    row.type = "button";
    row.addEventListener("click", () => openFriendProfile(friend));

    const avatar = document.createElement("img");
    avatar.src = friend.avatar;
    avatar.alt = "";

    const name = document.createElement("span");
    setVerifiedName(name, friend.name, friend.verified);

    row.append(avatar, name);
    profileFriendList.appendChild(row);
  });
}

function openAllFriends() {
  renderAllFriends();
  saveUiState({ view: "friends" });
  friendsOverlay.classList.add("active");
  friendsOverlay.setAttribute("aria-hidden", "false");
  friendsCloseButton.focus();
}

function closeAllFriends() {
  friendsOverlay.classList.remove("active");
  friendsOverlay.setAttribute("aria-hidden", "true");
  saveUiState(profileOverlay.classList.contains("active") ? { view: "profile" } : { view: "home" });
  seeAllFriendsButton.focus();
}

function renderAllFriends() {
  const friends = conversations.filter((conversation) => !conversation.blocked);
  allFriendsList.innerHTML = "";

  friends.forEach((friend) => {
    const row = document.createElement("button");
    row.className = "all-friend";
    row.type = "button";
    row.addEventListener("click", () => {
      openFriendProfile(friend);
    });

    const avatar = document.createElement("img");
    avatar.src = friend.avatar;
    avatar.alt = "";

    const text = document.createElement("span");
    const name = document.createElement("strong");
    setVerifiedName(name, friend.name, friend.verified);
    const status = document.createElement("span");
    status.textContent = friend.status;
    text.append(name, status);

    row.append(avatar, text);
    allFriendsList.appendChild(row);
  });
}

function openFriendProfile(conversation, options = {}) {
  activeFriendProfile = conversation;
  activeFriendProfileFromAdmin = !!options.fromAdminUsers;
  saveUiState({
    view: "friendProfile",
    conversationId: conversation.id,
    chatId: conversation.chatId,
    userId: conversation.userId,
    number: conversation.number
  });
  const profile = getFriendProfile(conversation);
  const isGroup = isGroupConversation(conversation, profile);
  if (isGroup) conversation.isGroup = true;
  setImageAfterLoad(friendProfilePhoto, profile.avatar, profile.name);
  const canEditGroup = isGroup && (conversation.participants || conversation.memberIds || []).includes(firebaseUser?.uid);
  friendPhotoWrap.classList.toggle("active", !isGroup && profile.status === "Active now");
  friendPhotoWrap.classList.remove("offline");
  setVerifiedName(friendProfileName, profile.name, profile.verified);
  friendProfileStatus.textContent = "";
  friendProfileBio.textContent = isGroup ? (profile.bio || "Group chat") : profile.bio;
  friendProfileUsername.textContent = isGroup ? (profile.username || "@group.webchat") : profile.username;
  friendProfileNumber.textContent = profile.number;
  friendProfileBio.closest("button").hidden = false;
  friendProfileUsername.closest("button").hidden = false;
  friendProfileNumber.closest("button").hidden = isGroup;
  renderGroupMembers(conversation);
  friendProfileBlockButton.hidden = isGroup || activeFriendProfileFromAdmin;
  friendProfileVerifyButton.hidden = isGroup || !isAdminAccount();
  friendProfileRestrictButton.hidden = isGroup || !isAdminAccount();
  friendProfilePasswordButton.hidden = isGroup || !isAdminAccount();
  friendProfileDeleteButton.hidden = !activeFriendProfileFromAdmin && !conversation.chatId;
  friendProfileDeleteButton.textContent = isGroup ? "Leave" : "Delete";
  friendProfileBlockButton.textContent = conversation.blockedByMe ? "Unblock user" : "Block user";
  friendProfileVerifyButton.textContent = profile.verified ? "Remove verify badge" : "Give verify badge";
  friendProfileRestrictButton.textContent = conversation.restricted ? "Unrestrict user" : "Restrict user";
  friendProfilePanel.classList.remove("details-editing");
  friendProfileName.closest(".profile-name-row")?.classList.remove("editing");
  friendProfileEditButton.hidden = !canEditGroup;
  friendProfileEditButton.textContent = "Edit";
  friendPhotoWrap.classList.toggle("editable", canEditGroup);
  friendProfileName.classList.toggle("editable", canEditGroup);
  friendProfileOverlay.classList.add("active");
  friendProfileOverlay.setAttribute("aria-hidden", "false");
  friendProfileCloseButton.focus();
}

async function copyFriendProfileNumber() {
  const number = friendProfileNumber.textContent.trim();
  if (!number) return;
  const copied = await copyText(number);
  const previous = friendProfileNumber.textContent;
  friendProfileNumber.textContent = copied ? "Copied" : "Copy failed";
  window.setTimeout(() => {
    friendProfileNumber.textContent = previous;
  }, 1100);
}

async function loadGroupMemberProfiles(conversation) {
  const ids = conversation?.participants || conversation?.memberIds || [];
  const rows = await Promise.all(ids.map(async (uid) => {
    if (uid === firebaseUser?.uid) {
      const ownProfile = {
        uid,
        name: myProfile.name || "You",
        avatar: myProfile.avatar || defaultAvatar
      };
      cacheMemberProfile(uid, ownProfile);
      return ownProfile;
    }
    const existing = conversations.find((item) => item.userId === uid);
    if (existing) {
      const profile = { uid, name: existing.name, avatar: existing.avatar, number: existing.number, username: existing.username, bio: existing.bio, verified: existing.verified };
      cacheMemberProfile(uid, profile);
      return profile;
    }
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (!snapshot.exists()) return { uid, name: "Member", avatar: defaultAvatar };
      const user = normalizeUserDoc(uid, snapshot.data());
      const profile = { uid, name: user.profile.name, avatar: user.profile.avatar, number: user.profile.number, username: user.profile.username, bio: user.profile.bio, verified: user.profile.verified };
      cacheMemberProfile(uid, profile);
      return profile;
    } catch (error) {
      return { uid, name: "Member", avatar: defaultAvatar };
    }
  }));
  return rows;
}

function createGroupMemberRow(conversation, member, admins, currentIsAdmin) {
  const row = document.createElement("div");
  row.className = "group-profile-member";
  const avatar = document.createElement("img");
  avatar.src = member.avatar || defaultAvatar;
  avatar.alt = "";
  const text = document.createElement("span");
  text.textContent = member.name;
  row.append(avatar, text);
  if (admins.has(member.uid)) {
    const adminBadge = document.createElement("strong");
    adminBadge.className = "group-admin-badge";
    adminBadge.textContent = "Admin";
    row.appendChild(adminBadge);
  }
  if (currentIsAdmin && member.uid !== firebaseUser.uid && !admins.has(member.uid)) {
    const adminButton = document.createElement("button");
    adminButton.type = "button";
    adminButton.textContent = "Make admin";
    adminButton.addEventListener("click", () => makeGroupAdmin(conversation, member.uid));
    const kickButton = document.createElement("button");
    kickButton.type = "button";
    kickButton.textContent = "Kick";
    kickButton.className = "danger";
    kickButton.addEventListener("click", () => kickGroupMember(conversation, member.uid));
    row.append(adminButton, kickButton);
  }
  return row;
}

function renderGroupMembers(conversation) {
  groupMembersList.innerHTML = "";
  const isGroup = !!conversation?.isGroup;
  groupMembersSection.hidden = !isGroup;
  if (!isGroup) return;

  const admins = new Set(conversation.admins?.length ? conversation.admins : [conversation.adminId].filter(Boolean));
  const currentIsAdmin = admins.has(firebaseUser?.uid);
  groupMembersList.innerHTML = `<p class="group-dialog-message">Loading members...</p>`;
  loadGroupMemberProfiles(conversation).then((members) => {
    if (activeFriendProfile !== conversation) return;
    groupMembersList.innerHTML = "";
    const adminMembers = members.filter((member) => admins.has(member.uid));
    adminMembers.forEach((member) => {
      groupMembersList.appendChild(createGroupMemberRow(conversation, member, admins, currentIsAdmin));
    });
    groupMembersSeeMoreButton.hidden = members.length <= adminMembers.length;
  });
}

async function openAllGroupMembers() {
  const conversation = activeFriendProfile;
  if (!conversation?.isGroup) return;
  const admins = new Set(conversation.admins?.length ? conversation.admins : [conversation.adminId].filter(Boolean));
  const currentIsAdmin = admins.has(firebaseUser?.uid);
  const members = await loadGroupMemberProfiles(conversation);

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay active";
  overlay.setAttribute("aria-hidden", "false");
  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog group-dialog";
  dialog.addEventListener("click", (event) => event.stopPropagation());
  const heading = document.createElement("h3");
  heading.textContent = "Members";
  const list = document.createElement("div");
  list.className = "group-member-full-list";
  members.forEach((member) => {
    list.appendChild(createGroupMemberRow(conversation, member, admins, currentIsAdmin));
  });
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "confirm-primary";
  closeButton.textContent = "Close";
  const close = () => overlay.remove();
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", close);
  dialog.append(heading, list, closeButton);
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
}

async function updateGroup(conversation, update) {
  Object.assign(conversation, update);
  await setDoc(doc(db, "chats", conversation.chatId), {
    ...update,
    updatedAt: firestoreServerTimestamp()
  }, { merge: true });
}

async function makeGroupAdmin(conversation, uid) {
  const admins = Array.from(new Set([...(conversation.admins || [conversation.adminId]), uid].filter(Boolean)));
  conversation.admins = admins;
  await updateGroup(conversation, { admins });
  renderGroupMembers(conversation);
}

async function kickGroupMember(conversation, uid) {
  const admins = new Set(conversation.admins || [conversation.adminId]);
  if (admins.has(uid)) return;
  conversation.participants = (conversation.participants || []).filter((item) => item !== uid);
  conversation.memberIds = conversation.participants;
  await updateGroup(conversation, { participants: conversation.participants });
  renderGroupMembers(conversation);
  renderConversations(searchInput.value);
}

async function editActiveGroupName() {
  if (!activeFriendProfile?.isGroup) return;
  if (!friendProfilePanel.classList.contains("details-editing")) return;
  if (!(activeFriendProfile.participants || activeFriendProfile.memberIds || []).includes(firebaseUser?.uid)) return;
  const row = friendProfileName.closest(".profile-name-row");
  friendProfileNameInput.value = activeFriendProfile.name || "";
  row?.classList.add("editing");
  friendProfileNameInput.focus();
  friendProfileNameInput.select();
}

async function saveActiveGroupName() {
  if (!activeFriendProfile?.isGroup) return;
  const nextName = friendProfileNameInput.value.trim();
  if (!nextName) return;
  activeFriendProfile.name = nextName;
  friendProfileName.textContent = nextName;
  friendProfileName.closest(".profile-name-row")?.classList.remove("editing");
  try {
    await updateGroup(activeFriendProfile, { groupName: nextName });
    chatName.textContent = nextName;
    renderConversations(searchInput.value);
  } catch (error) {
    window.alert("Group name update hoy nai. Firebase rules check koro.");
    openFriendProfile(activeFriendProfile);
  }
}

function canEditActiveGroup() {
  if (!activeFriendProfile?.isGroup) return false;
  if (!friendProfilePanel.classList.contains("details-editing")) return false;
  return (activeFriendProfile.participants || activeFriendProfile.memberIds || []).includes(firebaseUser?.uid);
}

function editActiveGroupField(button) {
  if (!canEditActiveGroup() || button.classList.contains("editing")) return;
  const field = button.dataset.groupField;
  if (!field || !["bio", "username"].includes(field)) return;

  const valueNode = button.querySelector("strong");
  const input = document.createElement("input");
  input.className = "profile-field-input";
  input.value = activeFriendProfile[field] || (field === "bio" ? "Group chat" : "@group.webchat");
  input.setAttribute("aria-label", field);
  button.classList.add("editing");
  valueNode.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  const save = async () => {
    if (saved) return;
    saved = true;
    let nextValue = input.value.trim();
    if (!nextValue) nextValue = field === "bio" ? "Group chat" : "@group.webchat";
    if (field === "username" && !nextValue.startsWith("@")) nextValue = `@${nextValue}`;
    const strong = document.createElement("strong");
    strong.id = valueNode.id;
    strong.textContent = nextValue;
    input.replaceWith(strong);
    button.classList.remove("editing");
    activeFriendProfile[field] = nextValue;
    try {
      await updateGroup(activeFriendProfile, { [field]: nextValue });
      renderConversations(searchInput.value);
    } catch (error) {
      window.alert("Group update hoy nai. Firebase rules check koro.");
      openFriendProfile(activeFriendProfile);
    }
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      openFriendProfile(activeFriendProfile);
    }
  });
}

async function changeActiveGroupPhoto(event) {
  if (!activeFriendProfile?.isGroup) return;
  if (!friendProfilePanel.classList.contains("details-editing")) return;
  if (!(activeFriendProfile.participants || activeFriendProfile.memberIds || []).includes(firebaseUser?.uid)) return;
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const avatar = await compressPhotoFile(file, 360, 0.82);
    activeFriendProfile.avatar = avatar;
    await updateGroup(activeFriendProfile, { avatar });
    setImageAfterLoad(friendProfilePhoto, avatar, activeFriendProfile.name);
    renderConversations(searchInput.value);
    if (currentConversation?.id === activeFriendProfile.id) renderMessages();
  } catch (error) {
    window.alert("Group photo update hoy nai.");
  }
}

async function blockActiveFriend() {
  if (!activeFriendProfile) return;
  const conversation = activeFriendProfile;
  if (conversation.blockedByMe) {
    await setConversationBlockState(conversation, false);
    closeFriendProfile();
    renderMessages();
    renderConversations(searchInput.value);
    return;
  }
  if (conversation.blockedByThem) return;
  const ok = await showConfirmDialog({
    title: "Block user?",
    message: conversation.name,
    confirmText: "Block",
    danger: true
  });
  if (!ok) return;
  await setConversationBlockState(conversation, true);
  closeFriendProfile();
  afterConversationHidden(conversation, { keepOpen: true });
  renderMessages();
}

function closeFriendProfile() {
  friendProfileOverlay.classList.remove("active");
  friendProfileOverlay.setAttribute("aria-hidden", "true");
  activeFriendProfileFromAdmin = false;
  if (friendsOverlay.classList.contains("active")) {
    saveUiState({ view: "friends" });
  } else if (profileOverlay.classList.contains("active")) {
    saveUiState({ view: "profile" });
  } else if (currentConversation) {
    saveUiState({
      view: "chat",
      conversationId: currentConversation.id,
      chatId: currentConversation.chatId,
      userId: currentConversation.userId,
      number: currentConversation.number
    });
  } else {
    saveUiState({ view: "home" });
  }
}

async function toggleActiveFriendVerification() {
  if (!activeFriendProfile || !isAdminAccount()) return;
  const nextVerified = !activeFriendProfile.verified;

  activeFriendProfile.verified = nextVerified;
  conversations.forEach((conversation) => {
    if (conversation.userId === activeFriendProfile.userId) conversation.verified = nextVerified;
  });

  try {
    await updateDoc(doc(db, "users", activeFriendProfile.userId), {
      verified: nextVerified,
      updatedAt: firestoreServerTimestamp()
    });
  } catch (error) {
    activeFriendProfile.verified = !nextVerified;
    window.alert("Verify update hoy nai. Firebase rules check koro.");
    return;
  }

  openFriendProfile(activeFriendProfile);
  renderConversations(searchInput.value);
  renderProfileFriends();
}

async function toggleActiveFriendRestriction() {
  if (!activeFriendProfile || !isAdminAccount()) return;
  const nextRestricted = !activeFriendProfile.restricted;

  activeFriendProfile.restricted = nextRestricted;
  conversations.forEach((conversation) => {
    if (conversation.userId === activeFriendProfile.userId) conversation.restricted = nextRestricted;
  });
  friendProfileRestrictButton.textContent = nextRestricted ? "Unrestrict user" : "Restrict user";

  try {
    await updateDoc(doc(db, "users", activeFriendProfile.userId), {
      restricted: nextRestricted,
      updatedAt: firestoreServerTimestamp()
    });
  } catch (error) {
    activeFriendProfile.restricted = !nextRestricted;
    conversations.forEach((conversation) => {
      if (conversation.userId === activeFriendProfile.userId) conversation.restricted = !nextRestricted;
    });
    friendProfileRestrictButton.textContent = !nextRestricted ? "Unrestrict user" : "Restrict user";
    window.alert("Restrict update hoy nai. Firebase rules check koro.");
    return;
  }

  renderConversations(searchInput.value);
  if (adminUsersOverlay.classList.contains("active")) openAdminUsers();
}

async function deleteActiveFriendProfile() {
  if (!activeFriendProfile || !firebaseUser) return;

  if (activeFriendProfile.isGroup) {
    const conversation = activeFriendProfile;
    const ok = await showConfirmDialog({
      title: "Leave group?",
      message: conversation.name,
      confirmText: "Leave",
      danger: true
    });
    if (!ok) return;
    conversation.participants = (conversation.participants || []).filter((uid) => uid !== firebaseUser.uid);
    conversation.memberIds = conversation.participants;
    conversation.admins = (conversation.admins || [conversation.adminId]).filter((uid) => uid !== firebaseUser.uid);
    try {
      await updateGroup(conversation, {
        participants: conversation.participants,
        admins: conversation.admins
      });
    } catch (error) {
      window.alert("Group leave hoy nai. Firebase rules check koro.");
      return;
    }
    conversations.splice(0, conversations.length, ...conversations.filter((item) => item.id !== conversation.id));
    closeFriendProfile();
    if (currentConversation?.id === conversation.id) clearDesktopConversationSelection();
    renderConversations(searchInput.value);
    return;
  }

  if (!activeFriendProfileFromAdmin) {
    const conversation = activeFriendProfile;
    const ok = await showConfirmDialog({
      title: "Delete chat?",
      message: conversation.name,
      confirmText: "Delete",
      danger: true
    });
    if (!ok) return;
    closeFriendProfile();
    await deleteConversationForCurrentUser(conversation);
    return;
  }

  if (!isAdminAccount()) return;

  const ok = await showConfirmDialog({
    title: "Delete user?",
    message: activeFriendProfile.name,
    confirmText: "Delete",
    danger: true
  });
  if (!ok) return;

  const conversation = activeFriendProfile;
  const deletedUid = conversation.userId;
  setAuthLoading(friendProfileDeleteButton, true);

  try {
    await deleteFirebaseUserData({
      uid: conversation.userId,
      number: conversation.number,
      profile: {
        name: conversation.name
      }
    });
  } catch (error) {
    setAuthLoading(friendProfileDeleteButton, false);
    window.alert("User delete hoy nai. Firebase rules check koro.");
    return;
  }

  conversations.filter((item) => item.userId === deletedUid).forEach((item) => clearLocalMessages(firebaseUser.uid, item.chatId));
  conversations.splice(0, conversations.length, ...conversations.filter((item) => item.userId !== deletedUid));

  closeFriendProfile();
  closeAllFriends();
  closeProfile();
  if (currentConversation?.id === conversation.id || currentConversation?.userId === deletedUid) {
    currentConversation = null;
    messages.innerHTML = "";
    chatName.textContent = "";
    chatStatus.textContent = "";
    chatAvatar.removeAttribute("src");
    chatAvatar.alt = "";
    chatAvatarWrap.classList.remove("active", "offline");
    updateChatEmptyState();
  }
  renderConversations(searchInput.value);
}

async function messageActiveFriendProfile() {
  if (!activeFriendProfile) return;
  if (!findConversationByUser({ uid: activeFriendProfile.userId, number: activeFriendProfile.number })) {
    conversations.unshift(activeFriendProfile);
  }
  closeFriendProfile();
  closeAllFriends();
  closeProfile();
  openConversation(activeFriendProfile.id);
}

function closeProfile() {
  profileOverlay.classList.remove("active");
  profileOverlay.setAttribute("aria-hidden", "true");
  saveUiState({ view: "home" });
  profileButton.focus();
}

function toggleChatOptions() {
  chatAddMemberButton.hidden = !currentConversation?.isGroup;
  refreshGroupRequestBadge();
  const isOpen = chatOptionsMenu.classList.toggle("active");
  chatOptionsMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeChatOptions() {
  chatOptionsMenu.classList.remove("active");
  chatOptionsMenu.setAttribute("aria-hidden", "true");
}

async function toggleMuteChat() {
  await setConversationMuted(currentConversation, !currentConversation.muted);
  muteChatButton.textContent = currentConversation.muted ? "Unmute" : "Mute";
  closeChatOptions();
  renderMessages();
  renderConversations(searchInput.value);
}

function addMemberToCurrentGroup() {
  if (!currentConversation?.isGroup) return;
  closeChatOptions();
  openAddGroup(currentConversation);
}

function openGroupRequests() {
  if (!currentConversation?.isGroup) return;
  closeChatOptions();
  const conversation = currentConversation;
  const requests = pendingGroupRequests(conversation);
  const isAdmin = currentUserIsGroupAdmin(conversation);

  const overlay = document.createElement("section");
  overlay.className = "confirm-overlay group-overlay active";
  overlay.setAttribute("aria-hidden", "false");
  const dialog = document.createElement("article");
  dialog.className = "confirm-dialog group-dialog";
  dialog.addEventListener("click", (event) => event.stopPropagation());
  const heading = document.createElement("h3");
  heading.textContent = "Add requests";
  const list = document.createElement("div");
  list.className = "group-member-full-list";

  if (!requests.length) {
    const empty = document.createElement("p");
    empty.className = "group-dialog-message";
    empty.textContent = "Kono request nai.";
    list.appendChild(empty);
  }

  requests.forEach((request) => {
    const row = document.createElement("div");
    row.className = "group-profile-member";
    const avatar = document.createElement("img");
    avatar.src = request.avatar || defaultAvatar;
    avatar.alt = "";
    const text = document.createElement("span");
    text.textContent = request.name || "User";
    row.append(avatar, text);
    if (request.requesterName) {
      const note = document.createElement("small");
      note.className = "group-request-note";
      note.textContent = `by ${request.requesterName}`;
      row.appendChild(note);
    }
    if (isAdmin) {
      const acceptButton = document.createElement("button");
      acceptButton.type = "button";
      acceptButton.textContent = "Accept";
      acceptButton.addEventListener("click", async () => {
        const participants = Array.from(new Set([...(conversation.participants || conversation.memberIds || []), request.uid]));
        const pendingAddRequests = pendingGroupRequests(conversation).filter((item) => item.uid !== request.uid);
        conversation.participants = participants;
        conversation.memberIds = participants;
        conversation.pendingAddRequests = pendingAddRequests;
        conversation.status = `${participants.length} members`;
        await updateGroup(conversation, { participants, pendingAddRequests });
        overlay.remove();
        refreshGroupRequestBadge();
        renderMessages();
        renderConversations(searchInput.value);
      });
      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.textContent = "Reject";
      rejectButton.className = "danger";
      rejectButton.addEventListener("click", async () => {
        const pendingAddRequests = pendingGroupRequests(conversation).filter((item) => item.uid !== request.uid);
        conversation.pendingAddRequests = pendingAddRequests;
        await updateGroup(conversation, { pendingAddRequests });
        overlay.remove();
        refreshGroupRequestBadge();
        renderMessages();
      });
      row.append(acceptButton, rejectButton);
    }
    list.appendChild(row);
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "confirm-primary";
  closeButton.textContent = "Close";
  const close = () => overlay.remove();
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", close);
  dialog.append(heading, list, closeButton);
  overlay.appendChild(dialog);
  phoneShell.appendChild(overlay);
}

async function clearChat() {
  closeChatOptions();
  const ok = await showConfirmDialog({
    title: "Clear chat?",
    message: currentConversation.name,
    confirmText: "Clear",
    danger: true
  });
  if (!ok) return;
  const conversation = currentConversation;
  const previousMessages = [...conversation.messages];
  const previousLastMessage = conversation.lastMessage;
  const previousLastSenderId = conversation.lastSenderId;
  conversation.messages = [];
  conversation.messagesLoaded = true;
  conversation.lastMessage = "";
  conversation.lastSenderId = "";
  conversation.time = "Now";
  if (conversation.chatId) {
    pendingLocalClears.add(localMessagesKey(firebaseUser.uid, conversation.chatId));
    clearLocalMessages(firebaseUser.uid, conversation.chatId);
  }
  renderMessages();
  renderConversations(searchInput.value);

  if (!conversation.chatId) return;

  try {
    const messagesSnapshot = await getDocs(collection(db, "chats", conversation.chatId, "messages"));
    await Promise.all(messagesSnapshot.docs.map((messageDoc) => {
      return setDoc(doc(db, "chats", conversation.chatId, "messages", messageDoc.id), {
        hiddenFor: {
          [firebaseUser.uid]: true
        }
      }, { merge: true });
    }));
    await setDoc(doc(db, "chats", conversation.chatId), {
      hiddenLastBy: {
        [firebaseUser.uid]: {
          text: "",
          senderId: "",
          time: "Now"
        }
      },
      updatedAt: firestoreServerTimestamp()
    }, { merge: true });
    pendingLocalClears.delete(localMessagesKey(firebaseUser.uid, conversation.chatId));
  } catch (error) {
    pendingLocalClears.delete(localMessagesKey(firebaseUser.uid, conversation.chatId));
    conversation.messages = previousMessages;
    conversation.messagesLoaded = true;
    conversation.lastMessage = previousLastMessage;
    conversation.lastSenderId = previousLastSenderId;
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    if (currentConversation?.id === conversation.id) renderMessages();
    renderConversations(searchInput.value);
    window.alert("Chat clear hoy nai. Firebase rules check koro.");
  }
}

function prepareOutgoingConversation(conversation) {
  const hadChat = !!conversation?.chatId;
  if (conversation?.isGroup) {
    conversation.pendingRemoteChat = true;
    return { chatId: conversation.chatId, hadChat };
  }
  if (!conversation?.chatId && firebaseUser && conversation?.userId) {
    const chatId = chatIdFor(firebaseUser.uid, conversation.userId);
    conversation.chatId = chatId;
    conversation.id = chatId;
    saveUiState({
      view: "chat",
      conversationId: conversation.id,
      chatId: conversation.chatId,
      userId: conversation.userId,
      number: conversation.number
    });
  }
  conversation.pendingRemoteChat = true;
  return { chatId: conversation?.chatId, hadChat };
}

async function saveOutgoingRemoteMessage(conversation, messageData, lastMessage, hadChat) {
  if (!conversation?.chatId) throw new Error("Chat ready hoy nai");
  const chatRef = doc(db, "chats", conversation.chatId);
  showConversationLocally(firebaseUser.uid, conversation.chatId);
  keepOutgoingConversationVisible(conversation);
  const participants = conversation.isGroup
    ? Array.from(new Set([firebaseUser.uid, ...(conversation.participants || conversation.memberIds || [])]))
    : [firebaseUser.uid, conversation.userId];
  const remoteMessageData = {
    ...messageData,
    senderName: myProfile.name || "",
    senderAvatar: myProfile.avatar || "",
    encrypted: true,
    text: messageData.type === "photo" ? "Photo" : "Message",
    textCipher: await encryptChatValue(conversation.chatId, messageData.text || ""),
    url: "",
    fileName: "",
    localCreatedAtMs: messageData.localCreatedAtMs || Date.now()
  };
  if (messageData.url) remoteMessageData.urlCipher = await encryptChatValue(conversation.chatId, messageData.url);
  if (messageData.fileName) remoteMessageData.fileNameCipher = await encryptChatValue(conversation.chatId, messageData.fileName);
  const chatUpdate = {
    participants,
    ...(conversation.isGroup ? { type: "group", groupName: conversation.name, adminId: conversation.adminId || firebaseUser.uid } : {}),
    lastMessage: lastMessage === "Photo" || lastMessage === "Voice" ? lastMessage : "Message",
    encryptedLast: true,
    lastSenderId: firebaseUser.uid,
    lastTime: "Now",
    [`unreadBy.${firebaseUser.uid}`]: 0,
    updatedAt: firestoreServerTimestamp()
  };
  participants
    .filter((uid) => uid && uid !== firebaseUser.uid)
    .forEach((uid) => {
      chatUpdate[`unreadBy.${uid}`] = fieldIncrement(1);
    });
  const visibilityUpdate = {
    [`hiddenBy.${firebaseUser.uid}`]: fieldDelete(),
  };
  participants.forEach((uid) => {
    visibilityUpdate[`hiddenBy.${uid}`] = fieldDelete();
    visibilityUpdate[`hiddenLastBy.${uid}`] = fieldDelete();
  });

  if (!hadChat) {
    const messageRef = collection(db, "chats", conversation.chatId, "messages").doc();
    const batch = db.batch();
    batch.set(messageRef, remoteMessageData);
    batch.set(chatRef, {
      ...chatUpdate,
      createdAt: firestoreServerTimestamp()
    }, { merge: true });
    await batch.commit();
    await updateDoc(chatRef, visibilityUpdate).catch(() => {});
    conversation.pendingRemoteChat = false;
    keepOutgoingConversationVisible(conversation, 25000);
    return messageRef.id;
  }

  const messageRef = await addDoc(collection(db, "chats", conversation.chatId, "messages"), remoteMessageData);
  await updateDoc(chatRef, {
    ...chatUpdate,
    ...visibilityUpdate
  });
  conversation.pendingRemoteChat = false;
  keepOutgoingConversationVisible(conversation, 25000);
  return messageRef.id;
}

async function sendMessage(text) {
  const conversation = currentConversation;
  if (!firebaseUser || (!conversation?.userId && !conversation?.isGroup)) return;
  if (!canMessageConversation(conversation)) {
    window.alert(restrictedMessage(conversation));
    return;
  }
  const { hadChat } = prepareOutgoingConversation(conversation);

  const message = {
    id: `${conversation.id}-${Date.now()}`,
    from: "me",
    senderId: firebaseUser.uid,
    text,
    time: currentClockTime(),
    date: "Today",
    status: navigator.onLine ? "sent" : "pending",
    replyTo: attachReply(),
    createdAtMs: Date.now(),
    localOrder: Date.now()
  };
  message.clientId = message.id;

  conversation.messages.push(message);
  conversation.messagesLoaded = true;
  conversation.lastMessage = text;
  conversation.lastSenderId = firebaseUser.uid;
  conversation.time = "Now";
  keepOutgoingConversationVisible(conversation);
  moveConversationToTop(currentConversation);
  writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
  forceMessagesScrollBottom = true;
  renderMessages();
  renderConversations(searchInput.value);

  const messageData = {
    clientId: message.clientId,
    text,
    senderId: firebaseUser.uid,
    receiverId: conversation.isGroup ? "" : conversation.userId,
    status: "sent",
    replyTo: message.replyTo,
    time: message.time,
    date: "Today",
    localCreatedAtMs: message.createdAtMs
  };
  clearReplyMessage();

  if (!navigator.onLine) {
    queueOutgoingMessage(conversation, message, messageData, text, hadChat);
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    forceMessagesScrollBottom = true;
    renderMessages();
    renderConversations(searchInput.value);
    return;
  }

  try {
    const messageId = await saveOutgoingRemoteMessage(conversation, {
      ...messageData,
      createdAt: firestoreServerTimestamp()
    }, text, hadChat);
    removeLocalMessage(firebaseUser.uid, conversation.chatId, message.clientId);
    message.id = messageId;
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    subscribeToMessages(conversation);
  } catch (error) {
    conversation.pendingRemoteChat = false;
    if (isOfflineSendError(error)) {
      message.status = "pending";
      queueOutgoingMessage(conversation, message, messageData, text, hadChat);
      writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
      forceMessagesScrollBottom = true;
      renderMessages();
      return;
    }
    window.alert("Message send hoy nai. Firebase rules check koro.");
  }
}

function toggleAttachmentMenu() {
  if (!attachmentMenu) return;
  const isOpen = attachmentMenu.classList.toggle("active");
  attachmentMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeAttachmentMenu() {
  if (!attachmentMenu) return;
  attachmentMenu.classList.remove("active");
  attachmentMenu.setAttribute("aria-hidden", "true");
}

function toggleEmojiMenu() {
  const isOpen = emojiMenu.classList.toggle("active");
  emojiMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeEmojiMenu() {
  emojiMenu.classList.remove("active");
  emojiMenu.setAttribute("aria-hidden", "true");
}

function updateComposerMode() {
  messageForm.classList.toggle("has-text", messageInput.value.trim().length > 0 || !!pendingVoiceBlob || !!pendingPhotoFile || voiceRecorder?.state === "recording");
}

function sendAttachment(input, label) {
  const file = input.files[0];
  if (!file) return;
  if (label === "Photo" && file.type.startsWith("image/")) {
    preparePhotoDraft(input, file);
    return;
  }
  const conversation = currentConversation;
  const message = {
    id: `${currentConversation.id}-${Date.now()}-${label}`,
    from: "me",
    senderId: firebaseUser?.uid,
    text: `${label}: ${file.name}`,
    time: "Now",
    date: "Today",
    status: "sent"
  };
  currentConversation.messages.push(message);
  currentConversation.time = "Now";
  moveConversationToTop(currentConversation);
  input.value = "";
  closeAttachmentMenu();
  renderMessages();
  renderConversations(searchInput.value);

  window.setTimeout(() => {
    message.status = "delivered";
    if (currentConversation.id === conversation.id) renderMessages();
  }, 450);

  window.setTimeout(() => {
    message.status = "seen";
    if (currentConversation.id === conversation.id) renderMessages();
  }, 1200);
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressPhotoFile(file) {
  const originalUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(originalUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const maxChars = 680 * 1024;
  const maxSizes = [1400, 1100, 900, 720, 560, 420];
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42, 0.34];
  let bestUrl = originalUrl;

  for (const maxSize of maxSizes) {
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of qualities) {
      const url = canvas.toDataURL("image/jpeg", quality);
      bestUrl = url;
      if (url.length <= maxChars) return url;
    }
  }

  return bestUrl;
}

function removePhotoDraftPanel() {
  document.querySelector(".photo-draft")?.remove();
  if (!pendingVoiceBlob && voiceRecorder?.state !== "recording") {
    messageForm.classList.remove("voice-mode");
  }
}

function clearPhotoDraft() {
  if (pendingPhotoUrl) URL.revokeObjectURL(pendingPhotoUrl);
  pendingPhotoFile = null;
  pendingPhotoUrl = "";
  photoInput.value = "";
  removePhotoDraftPanel();
  updateComposerMode();
}

function showPhotoDraft() {
  removePhotoDraftPanel();
  if (!pendingPhotoFile) return;
  messageForm.classList.add("voice-mode");
  const panel = document.createElement("div");
  panel.className = "photo-draft voice-draft";

  const preview = document.createElement("img");
  preview.src = pendingPhotoUrl;
  preview.alt = "";

  const label = document.createElement("span");
  label.className = "voice-draft-status";
  label.textContent = pendingPhotoFile.name || "Photo ready";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "voice-delete";
  deleteButton.setAttribute("aria-label", "Delete photo");
  deleteButton.appendChild(createSvgIcon(iconPaths.trash, "voice-delete-icon"));
  deleteButton.addEventListener("click", clearPhotoDraft);

  panel.append(preview, label, deleteButton);
  messageInputWrap.appendChild(panel);
  updateComposerMode();
}

function preparePhotoDraft(input, file) {
  if (!firebaseUser || (!currentConversation?.userId && !currentConversation?.isGroup)) {
    input.value = "";
    return;
  }
  clearVoiceDraft();
  clearPhotoDraft();
  pendingPhotoFile = file;
  pendingPhotoUrl = URL.createObjectURL(file);
  input.value = "";
  closeAttachmentMenu();
  closeEmojiMenu();
  showPhotoDraft();
}

async function sendPhotoAttachment(file = pendingPhotoFile) {
  const conversation = currentConversation;
  if (!firebaseUser || (!conversation?.userId && !conversation?.isGroup)) {
    clearPhotoDraft();
    return;
  }
  if (!file) return;
  try {
    const { hadChat } = prepareOutgoingConversation(conversation);
    const url = await compressPhotoFile(file);
    const message = {
      id: `${conversation.id}-${Date.now()}-photo`,
      from: "me",
      senderId: firebaseUser.uid,
      text: "Photo",
      type: "photo",
      url,
      fileName: file.name,
      time: currentClockTime(),
      date: "Today",
      status: navigator.onLine ? "sent" : "pending",
      replyTo: attachReply(),
      createdAtMs: Date.now(),
      localOrder: Date.now()
    };
    message.clientId = message.id;

    conversation.messages.push(message);
    conversation.messagesLoaded = true;
    conversation.lastMessage = "Photo";
    conversation.lastSenderId = firebaseUser.uid;
    conversation.time = "Now";
    keepOutgoingConversationVisible(conversation);
    moveConversationToTop(conversation);
    clearPhotoDraft();
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    forceMessagesScrollBottom = true;
    renderMessages();
    renderConversations(searchInput.value);

    const messageData = {
      clientId: message.clientId,
      text: "Photo",
      type: "photo",
      url,
      fileName: file.name,
      senderId: firebaseUser.uid,
      receiverId: conversation.isGroup ? "" : conversation.userId,
      status: "sent",
      replyTo: message.replyTo,
      time: message.time,
      date: "Today",
      localCreatedAtMs: message.createdAtMs
    };
    clearReplyMessage();

    if (!navigator.onLine) {
      queueOutgoingMessage(conversation, message, messageData, "Photo", hadChat);
      writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
      forceMessagesScrollBottom = true;
      renderMessages();
      renderConversations(searchInput.value);
      return;
    }

    try {
      const messageId = await saveOutgoingRemoteMessage(conversation, {
        ...messageData,
        createdAt: firestoreServerTimestamp()
      }, "Photo", hadChat);
      removeLocalMessage(firebaseUser.uid, conversation.chatId, message.clientId);
      message.id = messageId;
      writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
      subscribeToMessages(conversation);
    } catch (error) {
      conversation.pendingRemoteChat = false;
      if (isOfflineSendError(error)) {
        message.status = "pending";
        queueOutgoingMessage(conversation, message, messageData, "Photo", hadChat);
        writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
        forceMessagesScrollBottom = true;
        renderMessages();
        renderConversations(searchInput.value);
        return;
      }
      conversation.messages = conversation.messages.filter((item) => item.id !== message.id);
      renderMessages();
      renderConversations(searchInput.value);
      window.alert("Photo send hoy nai. Image aro chhoto kore abar try koro.");
    }
  } catch (error) {
    clearPhotoDraft();
    window.alert("Photo read kora jay nai. Abar try koro.");
  }
}

function formatVoiceDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function currentVoiceDurationMs() {
  if (!voiceStartedAt) return 0;
  const pausedNow = voiceRecorder?.state === "paused" && voicePausedAt ? Date.now() - voicePausedAt : 0;
  return Date.now() - voiceStartedAt - voicePausedMs - pausedNow;
}

function removeVoiceDraftPanel() {
  document.querySelector(".voice-draft")?.remove();
  messageForm.classList.remove("voice-mode", "voice-recording", "voice-ready");
  messageInput.readOnly = false;
}

function stopVoiceStream() {
  voiceStream?.getTracks?.().forEach((track) => track.stop());
  voiceStream = null;
}

function clearVoiceDraft() {
  const wasRecording = voiceRecorder?.state === "recording";
  voiceAutoSendAfterStop = false;
  if (wasRecording) {
    voiceDiscarding = true;
    voiceRecorder.stop();
  }
  window.clearInterval(voiceTimer);
  voiceTimer = null;
  voiceChunks = [];
  if (!wasRecording) voiceRecorder = null;
  voiceStartedAt = 0;
  voicePausedAt = 0;
  voicePausedMs = 0;
  stopVoiceStream();
  if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
  pendingVoiceBlob = null;
  pendingVoiceUrl = "";
  voiceButton.classList.remove("recording");
  removeVoiceDraftPanel();
  updateComposerMode();
}

function showVoiceDraft(recording = false) {
  removeVoiceDraftPanel();
  const paused = voiceRecorder?.state === "paused";
  const panel = document.createElement("div");
  panel.className = `voice-draft${recording ? " recording" : ""}${paused ? " paused" : ""}`;
  messageForm.classList.add("voice-mode", recording ? "voice-recording" : "voice-ready");
  messageInput.readOnly = true;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "voice-delete";
  deleteButton.setAttribute("aria-label", "Delete voice");
  deleteButton.appendChild(createSvgIcon(iconPaths.trash, "voice-delete-icon"));
  deleteButton.addEventListener("click", clearVoiceDraft);

  const status = document.createElement("span");
  status.className = "voice-draft-status";
  status.textContent = recording ? formatVoiceDuration(currentVoiceDurationMs()) : "Voice ready";

  const wave = document.createElement("span");
  wave.className = `voice-draft-wave${recording ? " recording" : ""}`;
  for (let index = 0; index < 22; index += 1) {
    const bar = document.createElement("span");
    bar.style.setProperty("--bar", String((index % 5) + 1));
    wave.appendChild(bar);
  }

  if (recording) {
    const pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.className = "voice-pause";
    pauseButton.setAttribute("aria-label", paused ? "Resume voice" : "Pause voice");
    pauseButton.textContent = paused ? "\u25b6" : "\u275a\u275a";
    pauseButton.addEventListener("click", toggleVoicePause);
    const dot = document.createElement("span");
    dot.className = "voice-record-dot";
    panel.append(deleteButton, dot, status, wave, pauseButton);
  } else {
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "voice-draft-play";
    playButton.textContent = "\u25b6";
    const audio = document.createElement("audio");
    audio.src = pendingVoiceUrl;
    audio.addEventListener("play", () => {
      playButton.textContent = "\u275a\u275a";
      wave.classList.add("recording");
    });
    audio.addEventListener("pause", () => {
      playButton.textContent = "\u25b6";
      wave.classList.remove("recording");
    });
    audio.addEventListener("ended", () => {
      playButton.textContent = "\u25b6";
      wave.classList.remove("recording");
    });
    playButton.addEventListener("click", () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });
    panel.append(deleteButton, playButton, wave, status, audio);
  }

  messageInputWrap.appendChild(panel);
  updateComposerMode();
}

function stopVoiceRecording() {
  if (voiceRecorder?.state === "recording" || voiceRecorder?.state === "paused") {
    voiceRecorder.stop();
  }
}

function toggleVoicePause() {
  if (!voiceRecorder || !["recording", "paused"].includes(voiceRecorder.state)) return;
  if (voiceRecorder.state === "recording") {
    voiceRecorder.pause();
    voicePausedAt = Date.now();
    window.clearInterval(voiceTimer);
    voiceTimer = null;
    showVoiceDraft(true);
    return;
  }
  if (voicePausedAt) voicePausedMs += Date.now() - voicePausedAt;
  voicePausedAt = 0;
  voiceRecorder.resume();
  showVoiceDraft(true);
  voiceTimer = window.setInterval(() => showVoiceDraft(true), 1000);
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    window.alert("Ei browser-e voice recording support kore na.");
    return;
  }
  if (!firebaseUser || !currentConversation?.userId) {
    window.alert("Age ekta chat open koro.");
    return;
  }
  if (voiceRecorder?.state === "recording") {
    stopVoiceRecording();
    return;
  }
  clearVoiceDraft();
  try {
    voiceDiscarding = false;
    voiceMimeType = "audio/webm";
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")
      ? { mimeType: "audio/webm;codecs=opus" }
      : {};
    voiceRecorder = new MediaRecorder(voiceStream, options);
    voiceMimeType = voiceRecorder.mimeType || "audio/webm";
    voiceChunks = [];
    voiceRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) voiceChunks.push(event.data);
    });
    voiceRecorder.addEventListener("pause", () => showVoiceDraft(true));
    voiceRecorder.addEventListener("resume", () => showVoiceDraft(true));
    voiceRecorder.addEventListener("stop", () => {
      window.clearInterval(voiceTimer);
      voiceTimer = null;
      if (voicePausedAt) {
        voicePausedMs += Date.now() - voicePausedAt;
        voicePausedAt = 0;
      }
      stopVoiceStream();
      voiceButton.classList.remove("recording");
      if (voiceDiscarding) {
        voiceDiscarding = false;
        voiceChunks = [];
        voiceRecorder = null;
        removeVoiceDraftPanel();
        updateComposerMode();
        return;
      }
      pendingVoiceBlob = new Blob(voiceChunks, { type: voiceMimeType || "audio/webm" });
      pendingVoiceUrl = URL.createObjectURL(pendingVoiceBlob);
      voiceRecorder = null;
      showVoiceDraft(false);
      if (voiceAutoSendAfterStop) {
        voiceAutoSendAfterStop = false;
        sendVoiceMessage();
      }
    });
    voiceStartedAt = Date.now();
    voicePausedAt = 0;
    voicePausedMs = 0;
    voiceRecorder.start();
    voiceButton.classList.add("recording");
    showVoiceDraft(true);
    voiceTimer = window.setInterval(() => showVoiceDraft(true), 1000);
  } catch (error) {
    clearVoiceDraft();
    window.alert("Microphone permission dao, tarpor abar try koro.");
  }
}

async function sendVoiceMessage() {
  const conversation = currentConversation;
  if (!pendingVoiceBlob || !firebaseUser || (!conversation?.userId && !conversation?.isGroup)) return;
  let queuedVoice = null;
  try {
    const { hadChat } = prepareOutgoingConversation(conversation);
    const url = await readFileAsDataUrl(pendingVoiceBlob);
    const duration = formatVoiceDuration(Date.now() - voiceStartedAt);
    const message = {
      id: `${conversation.id}-${Date.now()}-voice`,
      from: "me",
      senderId: firebaseUser.uid,
      text: "Voice",
      type: "voice",
      url,
      fileName: `Voice ${duration}`,
      time: currentClockTime(),
      date: "Today",
      status: navigator.onLine ? "sent" : "pending",
      replyTo: attachReply(),
      createdAtMs: Date.now(),
      localOrder: Date.now()
    };
    message.clientId = message.id;

    conversation.messages.push(message);
    conversation.messagesLoaded = true;
    conversation.lastMessage = "Voice";
    conversation.lastSenderId = firebaseUser.uid;
    conversation.time = "Now";
    keepOutgoingConversationVisible(conversation);
    moveConversationToTop(conversation);
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    forceMessagesScrollBottom = true;
    renderMessages();
    renderConversations(searchInput.value);

    const messageData = {
      clientId: message.clientId,
      text: "Voice",
      type: "voice",
      url,
      fileName: message.fileName,
      senderId: firebaseUser.uid,
      receiverId: conversation.isGroup ? "" : conversation.userId,
      status: "sent",
      replyTo: message.replyTo,
      time: message.time,
      date: "Today",
      localCreatedAtMs: message.createdAtMs
    };
    queuedVoice = { conversation, message, messageData, hadChat };
    clearReplyMessage();

    if (!navigator.onLine) {
      queueOutgoingMessage(conversation, message, messageData, "Voice", hadChat);
      writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
      clearVoiceDraft();
      forceMessagesScrollBottom = true;
      renderMessages();
      renderConversations(searchInput.value);
      return;
    }

    const messageId = await saveOutgoingRemoteMessage(conversation, {
      ...messageData,
      createdAt: firestoreServerTimestamp()
    }, "Voice", hadChat);
    removeLocalMessage(firebaseUser.uid, conversation.chatId, message.clientId);
    message.id = messageId;
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    clearVoiceDraft();
    subscribeToMessages(conversation);
  } catch (error) {
    if (queuedVoice?.conversation?.chatId && isOfflineSendError(error)) {
      queuedVoice.message.status = "pending";
      queueOutgoingMessage(queuedVoice.conversation, queuedVoice.message, queuedVoice.messageData, "Voice", queuedVoice.hadChat);
      writeLocalMessages(firebaseUser.uid, queuedVoice.conversation.chatId, queuedVoice.conversation.messages);
      clearVoiceDraft();
      forceMessagesScrollBottom = true;
      renderMessages();
      renderConversations(searchInput.value);
      return;
    }
    window.alert("Voice send hoy nai. Abar try koro.");
  }
}

function startLongPress(row, message) {
  cancelLongPress();
  longPressTriggered = false;
  longPressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    openMessageActions(row, message);
  }, 520);
}

function cancelLongPress() {
  window.clearTimeout(longPressTimer);
}

function closeMessageActions() {
  document.querySelectorAll(".message-actions.active").forEach((menu) => {
    menu.remove();
  });
}

function openMessageActions(row, message) {
  closeMessageActions();
  const menu = document.createElement("div");
  menu.className = "message-actions active";

  const replyButton = document.createElement("button");
  replyButton.type = "button";
  replyButton.textContent = "Reply";
  replyButton.addEventListener("click", () => {
    setReplyMessage(message);
    closeMessageActions();
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", async () => {
    const copied = await copyText(message.text || replySnippet(message));
    copyButton.textContent = copied ? "Copied" : "Copy failed";
    window.setTimeout(closeMessageActions, 500);
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => removeMessage(message));

  if (message.from === "me") {
    if (message.type && message.type !== "text") {
      menu.appendChild(replyButton);
      menu.appendChild(copyButton);
      menu.appendChild(removeButton);
      row.appendChild(menu);
      return;
    }
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editMessage(row, message));
    menu.appendChild(editButton);
  }

  menu.appendChild(replyButton);
  menu.appendChild(copyButton);
  menu.appendChild(removeButton);
  row.appendChild(menu);
}

function editMessage(row, message) {
  const bubble = row.querySelector(".message");
  if (!bubble) return;
  closeMessageActions();

  const input = document.createElement("input");
  input.className = "message-edit-input";
  input.value = message.text;
  bubble.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  const save = async () => {
    if (saved) return;
    saved = true;
    const trimmed = input.value.trim();
    const latest = currentConversation?.messages[currentConversation.messages.length - 1];
    const wasLatest = latest?.id === message.id;
    if (trimmed) {
      message.text = trimmed;
      if (currentConversation?.chatId && firebaseUser) {
        writeLocalMessages(firebaseUser.uid, currentConversation.chatId, currentConversation.messages);
      }
      if (currentConversation?.chatId && message.from === "me") {
        try {
          const textCipher = await encryptChatValue(currentConversation.chatId, trimmed);
          await updateDoc(doc(db, "chats", currentConversation.chatId, "messages", message.id), {
            encrypted: true,
            text: "Message",
            textCipher
          });
          if (wasLatest) {
            currentConversation.lastMessage = trimmed;
            currentConversation.lastSenderId = firebaseUser.uid;
            await updateDoc(doc(db, "chats", currentConversation.chatId), {
              lastMessage: "Message",
              encryptedLast: true,
              lastSenderId: firebaseUser.uid,
              lastTime: "Now",
              updatedAt: firestoreServerTimestamp()
            });
          }
        } catch (error) {
          window.alert("Message edit hoy nai. Firebase rules check koro.");
        }
      }
    }
    renderMessages();
    renderConversations(searchInput.value);
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      renderMessages();
    }
  });
}

async function removeMessage(message) {
  const ok = window.confirm("Remove this message?");
  if (!ok) return;
  const conversation = currentConversation;
  const previousMessages = [...conversation.messages];
  const previousLastMessage = conversation.lastMessage;
  const previousLastSenderId = conversation.lastSenderId;
  conversation.messages = conversation.messages.filter((item) => item.id !== message.id);
  conversation.lastMessage = latestMessage({ ...conversation, lastMessage: "" });
  conversation.lastSenderId = latestSenderId({ ...conversation, lastSenderId: "" });
  removeLocalMessage(firebaseUser.uid, conversation.chatId, message.id);
  closeMessageActions();
  renderMessages();
  renderConversations(searchInput.value);

  if (!conversation?.chatId) return;
  if (message.createdAtMs && message.createdAtMs <= Date.now() - messageRetentionMs) return;

  try {
    await setDoc(doc(db, "chats", conversation.chatId, "messages", message.id), {
      hiddenFor: {
        [firebaseUser.uid]: true
      }
    }, { merge: true });
    await syncVisibleLastMessage(conversation);
  } catch (error) {
    conversation.messages = previousMessages;
    conversation.lastMessage = previousLastMessage;
    conversation.lastSenderId = previousLastSenderId;
    writeLocalMessages(firebaseUser.uid, conversation.chatId, conversation.messages);
    if (currentConversation?.id === conversation.id) renderMessages();
    renderConversations(searchInput.value);
    window.alert("Message delete hoy nai. Firebase rules check koro.");
  }
}

function changeProfilePhoto() {
  const file = profilePhotoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const url = reader.result;
    setImageAfterLoad(profilePhoto, url, myProfile.name || "Profile");
    myProfile.avatar = url;
    setImageAfterLoad(profileButton.querySelector("img"), url, myProfile.name || "Profile");
    profilePhotoInput.value = "";
    persistCurrentUserProfile();
  });
  reader.readAsDataURL(file);
}

function changeProfileName() {
  if (!activeProfile?.editable) return;
  profileNameInput.value = myProfile.name;
  profileNameRow.classList.add("editing");
  profileNameInput.focus();
  profileNameInput.select();
}

function saveProfileName() {
  const trimmed = profileNameInput.value.trim();
  if (!trimmed) return;
  myProfile.name = trimmed;
  setVerifiedName(profileName, trimmed, myProfile.verified);
  profileNameRow.classList.remove("editing");
  persistCurrentUserProfile();
}

function editProfileField(button) {
  if (!activeProfile?.editable || button.classList.contains("editing")) return;
  const field = button.dataset.profileField;
  if (!field) return;

  const valueNode = button.querySelector("strong");
  const input = document.createElement("input");
  input.className = "profile-field-input";
  input.value = myProfile[field];
  input.setAttribute("aria-label", field);
  button.classList.add("editing");
  valueNode.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  const save = () => {
    if (saved) return;
    saved = true;
    const trimmed = input.value.trim();
    const nextValue = trimmed || myProfile[field];
    myProfile[field] = nextValue;
    const strong = document.createElement("strong");
    strong.id = valueNode.id;
    strong.textContent = nextValue;
    input.replaceWith(strong);
    button.classList.remove("editing");
    persistCurrentUserProfile();
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      input.value = myProfile[field];
      save();
    }
  });
}

function toggleProfileDetailsEdit() {
  if (!activeProfile?.editable) return;
  const editing = !profilePanel.classList.contains("details-editing");
  profilePanel.classList.toggle("details-editing", editing);
  profileEditButton.textContent = editing ? "Done" : "Edit";
}

function toggleFriendProfileEdit() {
  if (!activeFriendProfile?.isGroup) return;
  if (!(activeFriendProfile.participants || activeFriendProfile.memberIds || []).includes(firebaseUser?.uid)) return;
  const editing = !friendProfilePanel.classList.contains("details-editing");
  friendProfilePanel.classList.toggle("details-editing", editing);
  friendProfileEditButton.textContent = editing ? "Done" : "Edit";
}

async function unblockCurrentConversation() {
  if (!currentConversation?.blockedByMe) return;
  await setConversationBlockState(currentConversation, false);
  renderMessages();
  renderConversations(searchInput.value);
}

function editPassword() {
  openProfilePasswordDialog();
}

async function flashCopiedText(node, copiedText = "Copied") {
  if (!node) return;
  const previous = node.textContent;
  const copied = await copyText(previous.trim());
  node.textContent = copied ? copiedText : "Copy failed";
  window.setTimeout(() => {
    node.textContent = previous;
  }, 1000);
}

async function copyProfileUsername() {
  await flashCopiedText(profileUsername);
}

async function copyProfileNumber() {
  await flashCopiedText(document.querySelector("#profileNumber"));
}

async function copyFriendProfileUsername() {
  await flashCopiedText(friendProfileUsername);
}

function startGelButtonDrag(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.classList.contains("conversation") || button.closest(".chat-list")) return;
  if (event.target.closest(".password-change-action")) return;

  activeGelButton = button;
  gelStartX = event.clientX;
  gelStartY = event.clientY;
  gelMaxDistance = 0;
  button.classList.remove("gel-returning");
  button.classList.add("gel-dragging");
  button.setPointerCapture?.(event.pointerId);
}

function moveGelButtonDrag(event) {
  if (!activeGelButton) return;

  const dx = event.clientX - gelStartX;
  const dy = event.clientY - gelStartY;
  gelMaxDistance = Math.max(gelMaxDistance, Math.hypot(dx, dy));
}

function endGelButtonDrag(event) {
  if (!activeGelButton) return;

  const button = activeGelButton;
  const shouldSuppressClick = gelMaxDistance > 3;
  activeGelButton = null;
  gelMaxDistance = 0;
  if (shouldSuppressClick) {
    suppressGelClickUntil = Date.now() + 650;
    event.preventDefault();
    event.stopPropagation();
  }
  button.releasePointerCapture?.(event.pointerId);
  button.classList.remove("gel-dragging");
  button.classList.add("gel-returning");

  window.setTimeout(() => {
    button.classList.remove("gel-returning");
  }, 430);
}

backButton.addEventListener("click", closeConversation);
replyCancelButton.addEventListener("click", clearReplyMessage);
jumpBottomButton.addEventListener("click", () => {
  forceMessagesScrollBottom = true;
  scrollMessagesToBottom();
});
messages.addEventListener("scroll", updateJumpBottomButton);
loginForm.addEventListener("submit", handleLogin);
signupForm.addEventListener("submit", handleSignup);
loginNumber.addEventListener("input", () => {
  enforceAuthNumberLimit(loginNumber, { allowShortDemo: true });
  loginNumber.classList.remove("input-error");
  if (authMessage.textContent.startsWith("Wrong password") || authMessage.textContent === "No account found with this number." || authMessage.textContent === "Enter a valid phone number." || authMessage.textContent === "Use a valid phone number format.") setAuthMessage("");
});
loginNumber.addEventListener("blur", warnLoginNumberIfMissing);
loginNumber.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  loginPassword.focus();
  warnLoginNumberIfMissing();
});
loginPassword.addEventListener("focus", warnLoginNumberIfMissing);
loginPassword.addEventListener("pointerdown", warnLoginNumberIfMissing);
signupNumber.addEventListener("input", () => {
  enforceAuthNumberLimit(signupNumber);
  signupNumber.classList.remove("input-error");
  if (authMessage.textContent === "This number is already registered." || authMessage.textContent === "Enter a valid phone number." || authMessage.textContent === "Use a valid phone number format.") setAuthMessage("");
});
signupNumber.addEventListener("blur", warnSignupNumberIfExists);
signupNumber.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  signupPassword.focus();
  warnSignupNumberIfExists();
});
signupPassword.addEventListener("focus", warnSignupNumberIfExists);
signupPassword.addEventListener("pointerdown", warnSignupNumberIfExists);
signupPassword.addEventListener("input", () => {
  signupPassword.classList.remove("input-error");
  if (authMessage.textContent === "Password must be at least 6 characters.") setAuthMessage("");
});
signupPassword.addEventListener("blur", warnSignupPasswordTooShort);
signupPassword.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  signupConfirmPassword.focus();
  warnSignupPasswordTooShort();
});
signupConfirmPassword.addEventListener("focus", warnSignupPasswordTooShort);
signupConfirmPassword.addEventListener("pointerdown", warnSignupPasswordTooShort);
signupConfirmPassword.addEventListener("input", () => {
  signupConfirmPassword.classList.remove("input-error");
  if (authMessage.textContent === "Passwords do not match.") setAuthMessage("");
});
signupConfirmPassword.addEventListener("blur", warnSignupPasswordMismatch);
signupConfirmPassword.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  signupAdminCode.focus();
  warnSignupPasswordMismatch();
});
signupAdminCode.addEventListener("focus", warnSignupPasswordMismatch);
signupAdminCode.addEventListener("pointerdown", warnSignupPasswordMismatch);
signupCodePasteButton?.addEventListener("click", pasteSignupCode);
codeNoteButton.addEventListener("click", showVerificationCodeNote);
signupPhotoButton.addEventListener("click", () => signupPhotoInput.click());
signupPhotoInput.addEventListener("change", updateSignupPhoto);
authSwitchButton.addEventListener("click", async () => {
  if (signupComplete.classList.contains("active") && pendingSignupLogin) {
    authSwitchButton.disabled = true;
    const credentials = { ...pendingSignupLogin };
    try {
      await signInWithEmailAndPassword(auth, await authEmailForNumber(credentials.number), authPassword(credentials.password));
      pendingSignupProfile = null;
      pendingSignupLogin = null;
    } catch (error) {
      showAuthMode("login");
      loginNumber.value = credentials.number || "";
      setAuthMessage("Could not sign in automatically. Please enter your password.");
    } finally {
      authSwitchButton.disabled = false;
    }
    return;
  }
  const nextMode = signupForm.classList.contains("active") ? "login" : "signup";
  showAuthMode(nextMode);
});
homeOptionsButton.addEventListener("click", toggleHomeOptions);
showArchivedButton.addEventListener("click", () => openSavedView("archived"));
showBlockedButton.addEventListener("click", () => openSavedView("blocked"));
addUserButton.addEventListener("click", toggleFabActions);
fabGroupButton.addEventListener("click", () => openAddGroup());
fabFriendButton.addEventListener("click", toggleUserFinder);
userSearchButton.addEventListener("click", searchUserByNumber);
userSearchNumber.addEventListener("input", updateUserSearchButton);
userSearchNumber.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchUserByNumber();
  }
});
savedCloseButton.addEventListener("click", closeSavedView);
adminUsersButton.addEventListener("click", openAdminUsers);
adminUsersCloseButton.addEventListener("click", closeAdminUsers);
generateCodesButton.addEventListener("click", regenerateExpiredCodes);
profileButton.addEventListener("click", () => openProfile(myProfile));
function openCurrentChatProfile() {
  if (currentConversation) openFriendProfile(currentConversation);
}
chatAvatarWrap.addEventListener("click", openCurrentChatProfile);
chatTitle.addEventListener("click", openCurrentChatProfile);
profileBackdrop.addEventListener("click", closeProfile);
profileCloseButton.addEventListener("click", closeProfile);
profileEditButton.addEventListener("click", toggleProfileDetailsEdit);
profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());
profilePhotoInput.addEventListener("change", (event) => {
  if (activeFriendProfile?.isGroup && friendProfileOverlay.classList.contains("active")) {
    changeActiveGroupPhoto(event);
  } else {
    changeProfilePhoto(event);
  }
});
profileNameButton.addEventListener("click", changeProfileName);
profileNameInput.addEventListener("blur", saveProfileName);
profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveProfileName();
  }
  if (event.key === "Escape") {
    profileNameRow.classList.remove("editing");
  }
});
profileDetails.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-field]");
  if (button?.dataset.profileField === "username" && !profilePanel.classList.contains("details-editing")) {
    copyProfileUsername();
    return;
  }
  if (button?.dataset.profileField === "number") {
    return;
  }
  if (button && profilePanel.classList.contains("details-editing")) editProfileField(button);
  const passwordButton = event.target.closest("[data-password-action]");
  if (passwordButton) editPassword(passwordButton);
});

const profileNumberButton = profileNumber.closest("[data-profile-field='number']");
let profileNumberHoldTimer = null;
let profileNumberHoldCopied = false;

function clearProfileNumberHold() {
  window.clearTimeout(profileNumberHoldTimer);
  profileNumberHoldTimer = null;
}

profileNumberButton?.addEventListener("pointerdown", () => {
  profileNumberHoldCopied = false;
  clearProfileNumberHold();
  profileNumberHoldTimer = window.setTimeout(async () => {
    profileNumberHoldCopied = true;
    await copyProfileNumber();
  }, 520);
});

profileNumberButton?.addEventListener("pointerup", clearProfileNumberHold);
profileNumberButton?.addEventListener("pointercancel", clearProfileNumberHold);
profileNumberButton?.addEventListener("pointerleave", clearProfileNumberHold);
profileNumberButton?.addEventListener("click", (event) => {
  if (profileNumberHoldCopied) {
    profileNumberHoldCopied = false;
  }
  event.preventDefault();
  event.stopPropagation();
});
const passwordChangeAction = document.querySelector(".password-change-action");
passwordChangeAction?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});
passwordChangeAction?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  editPassword();
});
profileLogoutButton.addEventListener("click", logout);
blockedComposerUnblock.addEventListener("click", unblockCurrentConversation);
seeAllFriendsButton.addEventListener("click", openAllFriends);
friendsCloseButton.addEventListener("click", closeAllFriends);
friendProfileCloseButton.addEventListener("click", closeFriendProfile);
friendProfileEditButton.addEventListener("click", toggleFriendProfileEdit);
friendProfileNumber.closest("button")?.addEventListener("click", copyFriendProfileNumber);
friendProfileBio.closest("section")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-group-field]");
  if (!button) return;
  if (button.dataset.groupField === "username" && !canEditActiveGroup()) {
    copyFriendProfileUsername();
    return;
  }
  editActiveGroupField(button);
});
friendPhotoWrap.addEventListener("click", () => {
  if (!activeFriendProfile?.isGroup) return;
  if (!friendProfilePanel.classList.contains("details-editing")) return;
  if (!(activeFriendProfile.participants || activeFriendProfile.memberIds || []).includes(firebaseUser?.uid)) return;
  profilePhotoInput.click();
});
friendProfilePhotoButton.addEventListener("click", (event) => {
  event.stopPropagation();
  friendPhotoWrap.click();
});
friendProfileName.addEventListener("click", editActiveGroupName);
friendProfileNameButton.addEventListener("click", (event) => {
  event.stopPropagation();
  editActiveGroupName();
});
friendProfileNameInput.addEventListener("blur", saveActiveGroupName);
friendProfileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveActiveGroupName();
  }
  if (event.key === "Escape") {
    friendProfileName.closest(".profile-name-row")?.classList.remove("editing");
  }
});
groupMembersSeeMoreButton.addEventListener("click", openAllGroupMembers);
friendProfileMessageButton.addEventListener("click", messageActiveFriendProfile);
friendProfileBlockButton.addEventListener("click", blockActiveFriend);
friendProfileVerifyButton.addEventListener("click", toggleActiveFriendVerification);
friendProfileRestrictButton.addEventListener("click", toggleActiveFriendRestriction);
friendProfilePasswordButton.addEventListener("click", () => {
  if (!activeFriendProfile || !isAdminAccount()) return;
  changeAdminUserPassword({
    uid: activeFriendProfile.userId,
    number: activeFriendProfile.number,
    profile: getFriendProfile(activeFriendProfile)
  });
});
friendProfileDeleteButton.addEventListener("click", deleteActiveFriendProfile);
chatOptionsButton.addEventListener("click", toggleChatOptions);
chatAddMemberButton.addEventListener("click", addMemberToCurrentGroup);
chatGroupRequestsButton.addEventListener("click", openGroupRequests);
muteChatButton.addEventListener("click", toggleMuteChat);
clearChatButton.addEventListener("click", clearChat);
attachmentButton?.addEventListener("click", toggleAttachmentMenu);
emojiButton.addEventListener("click", toggleEmojiMenu);
emojiMenu.addEventListener("click", (event) => {
  if (event.target.tagName !== "BUTTON") return;
  const emoji = event.target.textContent;
  updateComposerMode();
  closeEmojiMenu();
  if (emoji) sendMessage(emoji);
});
photoButton?.addEventListener("click", () => photoInput.click());
inlinePhotoButton.addEventListener("click", () => photoInput.click());
voiceButton.addEventListener("click", startVoiceRecording);
fileButton?.addEventListener("click", () => fileInput.click());
photoInput.addEventListener("change", () => sendAttachment(photoInput, "Photo"));
fileInput?.addEventListener("change", () => sendAttachment(fileInput, "File"));
inlineComposeActions?.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  event.preventDefault();
  event.stopPropagation();
});
inlineComposeActions?.addEventListener("touchstart", (event) => {
  if (event.target.closest("button")) return;
  event.preventDefault();
  event.stopPropagation();
}, { passive: false });
inlineComposeActions?.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  event.preventDefault();
  event.stopPropagation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && profileOverlay.classList.contains("active")) {
    closeProfile();
  }
  if (event.key === "Escape" && savedOverlay.classList.contains("active")) {
    closeSavedView();
  }
  if (event.key === "Escape" && adminUsersOverlay.classList.contains("active")) {
    closeAdminUsers();
  }
  if (event.key === "Escape" && friendsOverlay.classList.contains("active")) {
    closeAllFriends();
  }
  if (event.key === "Escape" && friendProfileOverlay.classList.contains("active")) {
    closeFriendProfile();
  }
  if (event.key === "Escape") {
    document.querySelector(".photo-viewer-overlay")?.remove();
    closeAttachmentMenu();
    closeEmojiMenu();
    closeChatOptions();
    closeHomeOptions();
    if (activeConfirmDialog) activeConfirmDialog.remove();
    activeConfirmDialog = null;
    confirmOpenedAt = 0;
    closeMessageActions();
    closeConversationMenu();
  }
});

document.addEventListener("click", (event) => {
  if (Date.now() < suppressGelClickUntil && !event.target.closest(".conversation")) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

document.addEventListener("pointerdown", (event) => {
  const activeActions = document.querySelector(".message-actions.active");
  if (activeActions && !activeActions.contains(event.target)) {
    closeMessageActions();
  }
}, true);

document.addEventListener("click", (event) => {
  if (Date.now() < suppressGelClickUntil && !event.target.closest(".conversation")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (activeConversationMenu && Date.now() - menuOpenedAt < 450 && !event.target.closest(".conversation")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (activeConfirmDialog) {
    if (Date.now() - confirmOpenedAt < 450) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!event.target.closest(".confirm-dialog")) {
      activeConfirmDialog.remove();
      activeConfirmDialog = null;
      confirmOpenedAt = 0;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  if (activeConversationMenu && !event.target.closest(".conversation-action-menu")) {
    closeConversationMenu();
    if (!event.target.closest(".conversation")) {
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  if (document.querySelector(".message-actions.active") && !event.target.closest(".message-row")) {
    closeMessageActions();
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (attachmentMenu && attachmentButton && !attachmentMenu.contains(event.target) && !attachmentButton.contains(event.target)) {
    closeAttachmentMenu();
  }
  if (!emojiMenu.contains(event.target) && !emojiButton.contains(event.target)) {
    closeEmojiMenu();
  }
  if (!chatOptionsMenu.contains(event.target) && !chatOptionsButton.contains(event.target)) {
    closeChatOptions();
  }
  if (!homeOptionsMenu.contains(event.target) && !homeOptionsButton.contains(event.target)) {
    closeHomeOptions();
  }
  if (!fabActions.contains(event.target) && !addUserButton.contains(event.target)) {
    closeFabActions();
  }
  if (!userFinderPanel.contains(event.target) && !fabFriendButton.contains(event.target)) {
    closeUserFinder();
  }
});

document.addEventListener("pointerdown", startGelButtonDrag);
document.addEventListener("pointermove", moveGelButtonDrag);
document.addEventListener("pointerup", endGelButtonDrag);
document.addEventListener("pointercancel", endGelButtonDrag);

window.addEventListener("popstate", (event) => {
  if (desktopQuery.matches || allowBrowserBackExit) return;
  event.preventDefault();
  handlePhoneBackNavigation().finally(() => {
    pushAppBackTrap();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && currentConversation) {
    markConversationSeen(currentConversation);
  }
});

window.addEventListener("online", flushOutgoingQueue);

function updateMobileViewportHeight() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const top = viewport?.offsetTop || 0;
  document.documentElement.style.setProperty("--app-top", `${Math.round(top)}px`);
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  if (document.activeElement === messageInput && currentConversation) {
    window.requestAnimationFrame(() => {
      forceMessagesScrollBottom = true;
      scrollMessagesToBottom();
    });
  }
}

updateMobileViewportHeight();
window.addEventListener("resize", updateMobileViewportHeight);
window.visualViewport?.addEventListener("resize", updateMobileViewportHeight);
window.visualViewport?.addEventListener("scroll", updateMobileViewportHeight);

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (voiceRecorder?.state === "recording") {
    voiceAutoSendAfterStop = true;
    stopVoiceRecording();
    return;
  }
  if (pendingVoiceBlob) {
    sendVoiceMessage();
    return;
  }
  if (pendingPhotoFile) {
    sendPhotoAttachment();
    return;
  }
  const text = messageInput.value.trim();
  if (!text) return;
  messageInput.value = "";
  updateComposerMode();
  closeEmojiMenu();
  sendMessage(text);
});

searchInput.addEventListener("input", (event) => {
  renderConversations(event.target.value);
});

messageInput.addEventListener("input", updateComposerMode);
messageInput.addEventListener("focus", () => {
  window.setTimeout(() => {
    forceMessagesScrollBottom = true;
    scrollMessagesToBottom();
  }, 120);
});

messageForm.addEventListener("touchmove", (event) => {
  if (event.target.closest(".reply-preview, .emoji-menu, .voice-draft, .photo-draft")) return;
  event.preventDefault();
}, { passive: false });

desktopQuery.addEventListener("change", () => {
  if (phoneShell.classList.contains("auth-pending")) return;

  if (desktopQuery.matches) {
    homeScreen.classList.add("active");
    chatScreen.classList.add("active");
    phoneShell.classList.add("chat-open");
    seenAllowedChatId = null;
    renderMessages();
  } else {
    phoneShell.classList.remove("chat-open");
    chatScreen.classList.remove("active");
    homeScreen.classList.add("active");
    seenAllowedChatId = null;
  }
});

conversations.length = 0;
currentConversation = null;
ensureMessageData();
updateComposerMode();
renderConversations();
messages.innerHTML = "";

setupPasswordToggles();
registerServiceWorker();

if (desktopQuery.matches && !phoneShell.classList.contains("auth-pending")) {
  chatScreen.classList.add("active");
  phoneShell.classList.add("chat-open");
  seenAllowedChatId = null;
}

initializeAuth();
