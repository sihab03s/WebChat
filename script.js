import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp as firestoreServerTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp as databaseServerTimestamp,
  set
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBp8_xYdzYDamye0ggQiLM8c_3YCfbJ6-Y",
  authDomain: "webchat-sihab.firebaseapp.com",
  projectId: "webchat-sihab",
  storageBucket: "webchat-sihab.firebasestorage.app",
  messagingSenderId: "124112561955",
  appId: "1:124112561955:web:e0267ef845bb8dbc7f0e96",
  measurementId: "G-JKLWNBPXZQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

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
const authMessage = document.querySelector("#authMessage");
const authSwitchButton = document.querySelector("#authSwitchButton");
const chatList = document.querySelector("#chatList");
const messages = document.querySelector("#messages");
const chatName = document.querySelector("#chatName");
const chatStatus = document.querySelector("#chatStatus");
const chatAvatar = document.querySelector("#chatAvatar");
const adminUsersButton = document.querySelector("#adminUsersButton");
const adminUsersOverlay = document.querySelector("#adminUsersOverlay");
const adminUsersCloseButton = document.querySelector("#adminUsersCloseButton");
const adminUsersList = document.querySelector("#adminUsersList");
const storyRow = document.querySelector(".story-row");
const homeOptionsButton = document.querySelector("#homeOptionsButton");
const homeOptionsMenu = document.querySelector("#homeOptionsMenu");
const showArchivedButton = document.querySelector("#showArchivedButton");
const showBlockedButton = document.querySelector("#showBlockedButton");
const addUserButton = document.querySelector("#addUserButton");
const userFinderPanel = document.querySelector("#userFinderPanel");
const userSearchNumber = document.querySelector("#userSearchNumber");
const userSearchButton = document.querySelector("#userSearchButton");
const userSearchMessage = document.querySelector("#userSearchMessage");
const userSearchResult = document.querySelector("#userSearchResult");
const chatOptionsButton = document.querySelector("#chatOptionsButton");
const chatOptionsMenu = document.querySelector("#chatOptionsMenu");
const muteChatButton = document.querySelector("#muteChatButton");
const clearChatButton = document.querySelector("#clearChatButton");
const backButton = document.querySelector("#backButton");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const emojiButton = document.querySelector("#emojiButton");
const emojiMenu = document.querySelector("#emojiMenu");
const attachmentButton = document.querySelector("#attachmentButton");
const attachmentMenu = document.querySelector("#attachmentMenu");
const photoButton = document.querySelector("#photoButton");
const fileButton = document.querySelector("#fileButton");
const photoInput = document.querySelector("#photoInput");
const fileInput = document.querySelector("#fileInput");
const searchInput = document.querySelector("#searchInput");
const phoneShell = document.querySelector(".phone-shell");
const profileButton = document.querySelector("#profileButton");
const profileOverlay = document.querySelector("#profileOverlay");
const profileBackdrop = document.querySelector("#profileBackdrop");
const profileCloseButton = document.querySelector("#profileCloseButton");
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
const friendProfileCloseButton = document.querySelector("#friendProfileCloseButton");
const friendPhotoWrap = document.querySelector("#friendPhotoWrap");
const friendProfilePhoto = document.querySelector("#friendProfilePhoto");
const friendProfileName = document.querySelector("#friendProfileName");
const friendProfileStatus = document.querySelector("#friendProfileStatus");
const friendProfileBio = document.querySelector("#friendProfileBio");
const friendProfileUsername = document.querySelector("#friendProfileUsername");
const friendProfileNumber = document.querySelector("#friendProfileNumber");
const friendProfileMessageButton = document.querySelector("#friendProfileMessageButton");
const savedOverlay = document.querySelector("#savedOverlay");
const savedTitle = document.querySelector("#savedTitle");
const savedList = document.querySelector("#savedList");
const savedCloseButton = document.querySelector("#savedCloseButton");
const desktopQuery = window.matchMedia("(min-width: 760px)");

let currentConversation = null;
let longPressTimer;
let longPressTriggered = false;
let conversationHoldTimer;
let activeConversationMenu;
let activeConversationMenuAnchor = null;
let activeProfile = null;
let activeFriendProfile = null;
let currentUser = null;
let firebaseUser = null;
let unsubscribeChats = null;
let unsubscribeMessages = null;
let unsubscribePresence = null;

const myProfile = {
  name: "Sihab Ahmed",
  status: "Active now",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=260&q=80",
  bio: "Building a clean chat app",
  username: "@sihab.chat",
  number: "+880 1712-345678",
  editable: true
};

const authUsersKey = "webchatUsers";
const authSessionKey = "webchatCurrentUser";
const defaultAvatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=260&q=80";

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

function numberToEmail(number) {
  return `${number.trim()}@webchat.local`;
}

function authPassword(password) {
  const value = String(password);
  return value.length >= 6 ? value : `${value}webchat`;
}

function numberDocId(number) {
  return number.trim().replaceAll("/", "_");
}

function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
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
      bio: data.bio || "New WebChat user",
      username: data.username || `@${data.number}.webchat`,
      number: data.number || "",
      restricted: !!data.restricted,
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
    number: profile.number
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
    bio: "New WebChat user",
    username: `@${username}.webchat`,
    number,
    editable: true
  };
}

function setAuthMessage(message, isSuccess = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("success", isSuccess);
}

function showAuthMode(mode) {
  const isSignup = mode === "signup";
  loginForm.classList.toggle("active", !isSignup);
  signupForm.classList.toggle("active", isSignup);
  authTitle.textContent = isSignup ? "Create account" : "Login";
  authSwitchButton.textContent = isSignup ? "Already have an account" : "Create new account";
  setAuthMessage("");
}

function applyUserProfile(user) {
  currentUser = user;
  Object.assign(myProfile, user.profile, { editable: true });
  profileButton.querySelector("img").src = myProfile.avatar;
}

function persistCurrentUserProfile() {
  if (!currentUser || !firebaseUser) return;
  currentUser.profile = { ...myProfile, editable: true };
  updateDoc(doc(db, "users", firebaseUser.uid), {
    ...profilePayload(myProfile),
    updatedAt: firestoreServerTimestamp()
  });
}

async function createUserProfileDocument(userCredential, number, name) {
  const profile = createProfile(name, number);
  const uid = userCredential.user.uid;
  const payload = {
    uid,
    number,
    email: numberToEmail(number),
    ...profilePayload(profile),
    createdAt: firestoreServerTimestamp(),
    updatedAt: firestoreServerTimestamp()
  };

  await setDoc(doc(db, "users", uid), payload, { merge: true });
  await setDoc(doc(db, "numbers", numberDocId(number)), { uid, number });
  return normalizeUserDoc(uid, payload);
}

async function loadUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return normalizeUserDoc(uid, snapshot.data());
}

function completeLogin(user) {
  applyUserProfile(user);
  adminUsersButton.classList.toggle("active", user.number === "0");
  authScreen.classList.remove("active");
  authScreen.setAttribute("aria-hidden", "true");
  conversations.length = 0;
  currentConversation = null;
  subscribeToMyChats();
  renderConversations(searchInput.value);
  messages.innerHTML = "";
}

async function handleLogin(event) {
  event.preventDefault();
  const number = loginNumber.value.trim();
  const password = loginPassword.value;

  if (!number || !password) {
    setAuthMessage("Number ar password dao");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, numberToEmail(number), authPassword(password));
  } catch (error) {
    const isDemo = (number === "0" && password === "0") || (number === "1" && password === "1");
    if (!isDemo) {
      setAuthMessage("Number ba password thik na");
      return;
    }

    try {
      const demo = demoUsers.find((item) => item.number === number);
      const credential = await createUserWithEmailAndPassword(auth, numberToEmail(number), authPassword(password));
      await createUserProfileDocument(credential, number, demo.profile.name);
    } catch (createError) {
      setAuthMessage("Demo account ready na, abar try koro");
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = signupName.value.trim();
  const number = signupNumber.value.trim();
  const password = signupPassword.value;

  if (!name || !number || !password) {
    setAuthMessage("Name, number ar password lagbe");
    return;
  }

  try {
    const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(number)));
    if (numberSnapshot.exists()) {
      setAuthMessage("Ei number diye account ache");
      return;
    }

    const credential = await createUserWithEmailAndPassword(auth, numberToEmail(number), authPassword(password));
    await createUserProfileDocument(credential, number, name);
  } catch (error) {
    setAuthMessage(error.code === "auth/email-already-in-use" ? "Ei number diye account ache" : "Signup hoy nai");
  }
}

async function logout() {
  const uid = firebaseUser?.uid;

  if (unsubscribeChats) unsubscribeChats();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePresence) unsubscribePresence();

  try {
    if (uid) {
      await set(ref(realtimeDb, `status/${uid}`), {
        state: "offline",
        lastChanged: databaseServerTimestamp()
      });
    }
  } catch (error) {
    console.warn("Status offline update failed", error);
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  }

  currentUser = null;
  firebaseUser = null;
  closeHomeOptions();
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
  conversations.length = 0;
  currentConversation = null;
  renderConversations();
  messages.innerHTML = "";
  authScreen.classList.add("active");
  authScreen.setAttribute("aria-hidden", "false");
  showAuthMode("login");
  loginPassword.value = "";
  loginNumber.focus();
}

function initializeAuth() {
  onAuthStateChanged(auth, async (authUser) => {
    if (!authUser) {
      phoneShell.classList.remove("auth-pending");
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribePresence) unsubscribePresence();
      adminUsersOverlay.classList.remove("active");
      adminUsersOverlay.setAttribute("aria-hidden", "true");
      adminUsersButton.classList.remove("active");
      conversations.length = 0;
      currentConversation = null;
      renderConversations();
      messages.innerHTML = "";
      authScreen.classList.add("active");
      authScreen.setAttribute("aria-hidden", "false");
      showAuthMode("login");
      return;
    }

    firebaseUser = authUser;
    const profile = await loadUserProfile(authUser.uid);
    if (!profile) {
      phoneShell.classList.remove("auth-pending");
      await signOut(auth);
      authScreen.classList.add("active");
      authScreen.setAttribute("aria-hidden", "false");
      showAuthMode("login");
      setAuthMessage("This account is not available.");
      return;
    }
    phoneShell.classList.remove("auth-pending");
    completeLogin(profile);
    setupPresence(authUser.uid);
  });
}

function setupPresence(uid) {
  const connectedRef = ref(realtimeDb, ".info/connected");
  const statusRef = ref(realtimeDb, `status/${uid}`);

  onValue(connectedRef, (snapshot) => {
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

async function subscribeToMyChats() {
  if (!firebaseUser) return;
  if (unsubscribeChats) unsubscribeChats();

  const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", firebaseUser.uid));
  unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
    const rows = await Promise.all(snapshot.docs.map(async (chatDoc) => {
      const data = chatDoc.data();
      const otherUid = data.participants.find((uid) => uid !== firebaseUser.uid);
      const userSnapshot = await getDoc(doc(db, "users", otherUid));
      if (!userSnapshot.exists()) return null;
      const otherUser = normalizeUserDoc(otherUid, userSnapshot.data());
      const updatedAt = data.updatedAt?.toMillis?.() || 0;
      return {
        ...userToConversation(otherUser, chatDoc.id, {
          time: data.lastTime || "Now"
        }),
        messages: data.lastMessage ? [{ from: data.lastSenderId === firebaseUser.uid ? "me" : "them", text: data.lastMessage }] : [],
        pinned: !!data.pinnedBy?.[firebaseUser.uid],
        pinnedAt: data.pinnedAtBy?.[firebaseUser.uid] || 0,
        restricted: !!otherUser.profile.restricted,
        updatedAt
      };
    }));

    conversations.length = 0;
    rows.filter(Boolean).forEach((row) => conversations.push(row));
    sortConversations();
    if (!currentConversation || !conversations.some((item) => item.id === currentConversation.id)) {
      currentConversation = conversations[0] || null;
      if (currentConversation && desktopQuery.matches) openConversation(currentConversation.id);
    }
    if (!currentConversation) {
      messages.innerHTML = "";
      chatName.textContent = "";
      chatStatus.textContent = "";
      chatAvatar.removeAttribute("src");
      chatAvatar.alt = "";
    }
    renderConversations(searchInput.value);
  });
}

function subscribeToMessages(conversation) {
  if (unsubscribeMessages) unsubscribeMessages();
  if (!conversation?.chatId) return;

  const messagesQuery = query(collection(db, "chats", conversation.chatId, "messages"), orderBy("createdAt"));
  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    conversation.messages = snapshot.docs.map((messageDoc) => {
      const data = messageDoc.data();
      const fromMe = data.senderId === firebaseUser.uid;
      if (!fromMe && data.status !== "seen") {
        updateDoc(doc(db, "chats", conversation.chatId, "messages", messageDoc.id), {
          status: "seen"
        });
      }
      return {
        id: messageDoc.id,
        from: fromMe ? "me" : "them",
        text: data.text,
        time: data.time || "Now",
        date: data.date || "Today",
        status: data.status || "sent"
      };
    });
    renderMessages();
    renderConversations(searchInput.value);
  });
}

function subscribeToPresence(conversation) {
  if (unsubscribePresence) unsubscribePresence();
  if (!conversation?.userId) return;

  unsubscribePresence = onValue(ref(realtimeDb, `status/${conversation.userId}`), (snapshot) => {
    const nextStatus = formatPresenceStatus(snapshot.val());
    conversation.status = nextStatus;
    conversations.forEach((item) => {
      if (item.userId === conversation.userId) item.status = nextStatus;
    });
    renderMessages();
    renderConversations(searchInput.value);
  });
}

function formatPresenceStatus(value) {
  if (value?.state === "online") return "Active now";

  const lastChanged = typeof value?.lastChanged === "number" ? value.lastChanged : 0;
  if (!lastChanged) return "Offline";

  const elapsed = Math.max(0, Date.now() - lastChanged);
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
  return conversation.messages[conversation.messages.length - 1]?.text || "";
}

function moveConversationToTop(conversation) {
  conversation.updatedAt = Date.now();
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
  const query = filter.trim().toLowerCase();
  chatList.innerHTML = "";
  renderStories();

  conversations
    .filter((conversation) => !conversation.archived && !conversation.blocked)
    .filter((conversation) => {
      const haystack = `${conversation.name} ${latestMessage(conversation)}`.toLowerCase();
      return haystack.includes(query);
    })
    .forEach((conversation) => {
      const button = document.createElement("article");
      button.className = `conversation${conversation.id === currentConversation?.id ? " selected" : ""}`;
      button.setAttribute("role", "button");
      button.setAttribute("tabindex", "0");

      const avatar = document.createElement("img");
      avatar.src = conversation.avatar;
      avatar.alt = "";
      avatar.addEventListener("click", (event) => {
        event.stopPropagation();
        openFriendProfile(conversation);
      });

      const avatarWrap = document.createElement("span");
      avatarWrap.className = `conversation-avatar-wrap${conversation.status === "Active now" ? " active" : " offline"}`;
      avatarWrap.appendChild(avatar);

      const text = document.createElement("span");
      text.className = "conversation-text";

      const name = document.createElement("strong");
      name.textContent = conversation.name;
      if (conversation.pinned) {
        const pinIcon = document.createElement("span");
        pinIcon.className = "pin-icon";
        pinIcon.setAttribute("aria-label", "Pinned");
        name.appendChild(pinIcon);
      }
      if (conversation.muted) {
        const muteIcon = document.createElement("span");
        muteIcon.className = "mute-icon";
        muteIcon.setAttribute("aria-label", "Muted");
        name.appendChild(muteIcon);
      }

      const preview = document.createElement("p");
      preview.textContent = latestMessage(conversation);

      const meta = document.createElement("span");
      meta.className = "conversation-meta";

      const time = document.createElement("time");
      time.textContent = conversation.time;

      button.addEventListener("pointerdown", (event) => {
        if (event.target.tagName === "IMG") return;
        window.clearTimeout(conversationHoldTimer);
        conversationHoldTimer = window.setTimeout(() => {
          longPressTriggered = true;
          openConversationMenu(button, conversation);
        }, 520);
      });
      button.addEventListener("pointerup", () => window.clearTimeout(conversationHoldTimer));
      button.addEventListener("pointerleave", () => window.clearTimeout(conversationHoldTimer));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openConversationMenu(button, conversation);
      });

      text.append(name, preview);
      meta.appendChild(time);

      if (conversation.unread) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = conversation.unread;
        meta.appendChild(badge);
      }

      button.append(avatarWrap, text, meta);
      button.addEventListener("click", (event) => {
        if (longPressTriggered) {
          longPressTriggered = false;
          event.stopPropagation();
          return;
        }
        openConversation(conversation.id);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openConversation(conversation.id);
      });
      chatList.appendChild(button);
    });
}

function renderStories() {
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
    name.textContent = conversation.name.split(" ")[0] || conversation.name;

    story.append(avatar, name);
    storyRow.appendChild(story);
  });
}

function openConversationMenu(anchor, conversation) {
  closeConversationMenu();

  const menu = document.createElement("div");
  menu.className = "conversation-action-menu active";
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  positionFloatingMenu(menu, anchor);

  const muteButton = document.createElement("button");
  muteButton.type = "button";
  muteButton.textContent = conversation.muted ? "Unmute" : "Mute";
  muteButton.addEventListener("click", () => {
    conversation.muted = !conversation.muted;
    closeConversationMenu();
    renderMessages();
    renderConversations(searchInput.value);
  });

  const pinButton = document.createElement("button");
  pinButton.type = "button";
  pinButton.textContent = conversation.pinned ? "Unpin" : "Pin";
  pinButton.addEventListener("click", async () => {
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

  const archiveButton = document.createElement("button");
  archiveButton.type = "button";
  archiveButton.textContent = "Archive";
  archiveButton.addEventListener("click", () => {
    const ok = window.confirm(`Archive ${conversation.name}?`);
    if (!ok) return;
    conversation.archived = true;
    afterConversationHidden(conversation);
  });

  const blockButton = document.createElement("button");
  blockButton.type = "button";
  blockButton.textContent = "Block";
  blockButton.addEventListener("click", () => {
    const ok = window.confirm(`Block ${conversation.name}?`);
    if (!ok) return;
    conversation.blocked = true;
    afterConversationHidden(conversation);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    const ok = window.confirm(`Delete chat with ${conversation.name}?`);
    if (!ok) return;
    const index = conversations.findIndex((item) => item.id === conversation.id);
    if (index >= 0) conversations.splice(index, 1);
    afterConversationHidden(conversation);
  });

  menu.append(muteButton, pinButton, archiveButton, blockButton, deleteButton);
  phoneShell.appendChild(menu);
  activeConversationMenu = menu;
  activeConversationMenuAnchor = anchor;
}

function closeConversationMenu() {
  if (!activeConversationMenu) return;
  activeConversationMenu.remove();
  activeConversationMenu = null;
  activeConversationMenuAnchor = null;
}

function positionFloatingMenu(menu, anchor) {
  const shellRect = phoneShell.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  menu.style.top = `${Math.max(8, anchorRect.top - shellRect.top + 28)}px`;
  menu.style.right = `${Math.max(10, shellRect.right - anchorRect.right + 10)}px`;
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

function toggleUserFinder() {
  const isOpen = userFinderPanel.classList.toggle("active");
  userFinderPanel.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) {
    userSearchNumber.focus();
  }
}

function closeUserFinder() {
  userFinderPanel.classList.remove("active");
  userFinderPanel.setAttribute("aria-hidden", "true");
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
    const chatId = chatIdFor(firebaseUser.uid, user.uid || user.id);
    await setDoc(doc(db, "chats", chatId), {
      participants: [firebaseUser.uid, user.uid || user.id],
      createdAt: firestoreServerTimestamp(),
      updatedAt: firestoreServerTimestamp(),
      lastMessage: "",
      lastSenderId: ""
    }, { merge: true });
    conversation = userToConversation(user, chatId);
    conversations.unshift(conversation);
  } else {
    moveConversationToTop(conversation);
  }

  closeUserFinder();
  renderConversations(searchInput.value);
  openConversation(conversation.id);
}

function openUserProfile(user) {
  const conversation = findConversationByUser(user) || createConversationFromUser(user);
  openFriendProfile(conversation);
}

function isAdminAccount(user = currentUser) {
  return user?.number === "0";
}

function canMessageConversation(conversation) {
  if (!currentUser || !conversation) return false;
  if (isAdminAccount()) return true;
  if (currentUser.profile?.restricted && conversation.number !== "0") return false;
  if (conversation.restricted) return false;
  return true;
}

function restrictedMessage(conversation) {
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
  name.textContent = user.profile.name;
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
  const number = userSearchNumber.value.trim();
  userSearchResult.classList.remove("active");
  userSearchResult.innerHTML = "";
  userSearchMessage.textContent = "";

  if (!number) {
    userSearchMessage.textContent = "Number dao";
    return;
  }

  if (currentUser && number === currentUser.number) {
    userSearchMessage.textContent = "Eta tomar nijer account";
    return;
  }

  const numberSnapshot = await getDoc(doc(db, "numbers", numberDocId(number)));

  if (!numberSnapshot.exists()) {
    userSearchMessage.textContent = "Ei number-er user pawa jay nai";
    return;
  }

  const user = await loadUserProfile(numberSnapshot.data().uid);
  renderUserSearchResult(user);
}

function visibleConversations() {
  return conversations.filter((conversation) => !conversation.archived && !conversation.blocked);
}

function afterConversationHidden(conversation) {
  closeConversationMenu();
  const visible = visibleConversations();
  if (currentConversation?.id === conversation.id) {
    currentConversation = visible[0] || conversations[0];
    if (currentConversation) renderMessages();
  }
  renderConversations(searchInput.value);
}

function openSavedView(type) {
  closeHomeOptions();
  savedOverlay.classList.add("active");
  savedOverlay.setAttribute("aria-hidden", "false");
  savedTitle.textContent = type === "archived" ? "Archived chats" : "Blocked users";
  renderSavedList(type);
  savedCloseButton.focus();
}

function closeSavedView() {
  savedOverlay.classList.remove("active");
  savedOverlay.setAttribute("aria-hidden", "true");
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
    name.textContent = conversation.name;
    const preview = document.createElement("span");
    preview.textContent = latestMessage(conversation);
    text.append(name, preview);

    const action = document.createElement("button");
    action.type = "button";
    action.textContent = actionText;
    action.addEventListener("click", () => {
      conversation[key] = false;
      renderSavedList(type);
      renderConversations(searchInput.value);
    });

    row.append(avatar, text, action);
    savedList.appendChild(row);
  });
}

async function openAdminUsers() {
  if (currentUser?.number !== "0") return;
  adminUsersList.innerHTML = "";
  adminUsersOverlay.classList.add("active");
  adminUsersOverlay.setAttribute("aria-hidden", "false");

  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.docs.forEach((userDoc) => {
    const user = normalizeUserDoc(userDoc.id, userDoc.data());
    if (user.uid === firebaseUser.uid) return;

    const row = document.createElement("article");
    row.className = "saved-item";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.addEventListener("click", (event) => {
      if (longPressTriggered) {
        longPressTriggered = false;
        event.stopPropagation();
        return;
      }
      openUserProfile(user);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openUserProfile(user);
    });
    row.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
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
    name.textContent = user.profile.name;
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
  adminUsersOverlay.classList.remove("active");
  adminUsersOverlay.setAttribute("aria-hidden", "true");
  closeConversationMenu();
}

async function deleteAdminUser(user) {
  const ok = window.confirm(`Delete ${user.profile.name}? This removes the user profile and chat records from Firestore.`);
  if (!ok) return;

  const chatsSnapshot = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", user.uid)));
  await Promise.all(chatsSnapshot.docs.map(async (chatDoc) => {
    const messagesSnapshot = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    await Promise.all(messagesSnapshot.docs.map((messageDoc) => deleteDoc(doc(db, "chats", chatDoc.id, "messages", messageDoc.id))));
    await deleteDoc(doc(db, "chats", chatDoc.id));
  }));
  await deleteDoc(doc(db, "numbers", numberDocId(user.number)));
  await deleteDoc(doc(db, "users", user.uid));
  await openAdminUsers();
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
  window.alert("For security, Firebase only allows password changes from the signed-in user or a trusted Admin backend. Add a Firebase Cloud Function/Admin SDK endpoint, then this option can update the user's Auth password safely.");
}

function openAdminUserMenu(anchor, user) {
  closeConversationMenu();
  const menu = document.createElement("div");
  menu.className = "conversation-action-menu admin-action-menu active";
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  positionFloatingMenu(menu, anchor);

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

function renderMessages() {
  if (!currentConversation) return;
  chatName.textContent = "";
  chatName.appendChild(document.createTextNode(currentConversation.name));
  if (currentConversation.muted) {
    const muteIcon = document.createElement("span");
    muteIcon.className = "mute-icon";
    muteIcon.setAttribute("aria-label", "Muted");
    chatName.appendChild(muteIcon);
  }
  chatStatus.textContent = currentConversation.muted ? "Muted" : currentConversation.status;
  muteChatButton.textContent = currentConversation.muted ? "Unmute" : "Mute";
  chatAvatar.src = currentConversation.avatar;
  chatAvatar.alt = currentConversation.name;
  messages.innerHTML = `<div class="time-divider">Today</div>`;
  const lastOwnMessage = [...currentConversation.messages].reverse().find((message) => message.from === "me");
  const lastSeenOwnMessage = [...currentConversation.messages].reverse().find((message) => {
    return message.from === "me" && message.status === "seen";
  });

  currentConversation.messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = `message-row ${message.from}`;
    const bubble = document.createElement("p");
    bubble.className = "message";
    bubble.textContent = message.text;
    bubble.addEventListener("click", () => {
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
      closeMessageActions();
      row.classList.toggle("show-time");
    });
    bubble.addEventListener("pointerdown", () => startLongPress(row, message));
    bubble.addEventListener("pointerup", cancelLongPress);
    bubble.addEventListener("pointerleave", cancelLongPress);
    bubble.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openMessageActions(row, message);
    });
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = `${message.date} at ${message.time}`;
    row.appendChild(bubble);
    const isLastSeen = message.id === lastSeenOwnMessage?.id;
    const isLastPending = message.id === lastOwnMessage?.id && message.status !== "seen";
    if (message.from === "me" && (isLastSeen || isLastPending)) {
      row.appendChild(createMessageStatus(message));
    }
    row.appendChild(time);
    messages.appendChild(row);
  });

  messages.scrollTop = messages.scrollHeight;
}

function createMessageStatus(message) {
  const status = document.createElement("span");
  status.className = `message-status ${message.status || "sent"}`;

  if (message.status === "seen") {
    const image = document.createElement("img");
    image.src = currentConversation.avatar;
    image.alt = "Seen";
    status.appendChild(image);
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

function openConversation(id) {
  currentConversation = conversations.find((conversation) => conversation.id === id) || conversations[0];
  if (!currentConversation) return;
  currentConversation.unread = 0;
  phoneShell.classList.add("chat-open");
  if (!desktopQuery.matches) {
    homeScreen.classList.remove("active");
  }
  chatScreen.classList.add("active");
  subscribeToMessages(currentConversation);
  subscribeToPresence(currentConversation);
  renderMessages();
  renderConversations(searchInput.value);
  if (!desktopQuery.matches) {
    messageInput.focus();
  }
}

function closeConversation() {
  if (desktopQuery.matches) return;
  phoneShell.classList.remove("chat-open");
  chatScreen.classList.remove("active");
  homeScreen.classList.add("active");
  searchInput.focus();
}

function getFriendProfile(conversation) {
  return {
    name: conversation.name,
    status: conversation.status,
    avatar: conversation.avatar,
    bio: conversation.bio || latestMessage(conversation),
    username: conversation.username || `@${conversation.id}.webchat`,
    number: conversation.number || "+880 1700-000000",
    editable: false
  };
}

function openProfile(profile = myProfile) {
  activeProfile = profile;
  profilePhoto.src = profile.avatar;
  profilePhoto.alt = profile.name;
  profileName.textContent = profile.name;
  profileStatus.textContent = "";
  document.querySelector("#profileBio").textContent = profile.bio;
  document.querySelector("#profileUsername").textContent = profile.username;
  document.querySelector("#profileNumber").textContent = profile.number;
  profilePhotoButton.classList.toggle("hidden", !profile.editable);
  profileNameButton.classList.toggle("hidden", !profile.editable);
  profileName.classList.toggle("editable", !!profile.editable);
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
    name.textContent = friend.name;

    row.append(avatar, name);
    profileFriendList.appendChild(row);
  });
}

function openAllFriends() {
  renderAllFriends();
  friendsOverlay.classList.add("active");
  friendsOverlay.setAttribute("aria-hidden", "false");
  friendsCloseButton.focus();
}

function closeAllFriends() {
  friendsOverlay.classList.remove("active");
  friendsOverlay.setAttribute("aria-hidden", "true");
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
    name.textContent = friend.name;
    const status = document.createElement("span");
    status.textContent = friend.status;
    text.append(name, status);

    row.append(avatar, text);
    allFriendsList.appendChild(row);
  });
}

function openFriendProfile(conversation) {
  activeFriendProfile = conversation;
  const profile = getFriendProfile(conversation);
  friendProfilePhoto.src = profile.avatar;
  friendProfilePhoto.alt = profile.name;
  friendPhotoWrap.classList.toggle("active", profile.status === "Active now");
  friendPhotoWrap.classList.toggle("offline", profile.status !== "Active now");
  friendProfileName.textContent = profile.name;
  friendProfileStatus.textContent = "";
  friendProfileBio.textContent = profile.bio;
  friendProfileUsername.textContent = profile.username;
  friendProfileNumber.textContent = profile.number;
  friendProfileOverlay.classList.add("active");
  friendProfileOverlay.setAttribute("aria-hidden", "false");
  friendProfileCloseButton.focus();
}

function closeFriendProfile() {
  friendProfileOverlay.classList.remove("active");
  friendProfileOverlay.setAttribute("aria-hidden", "true");
}

async function messageActiveFriendProfile() {
  if (!activeFriendProfile) return;
  if (!activeFriendProfile.chatId && firebaseUser && activeFriendProfile.userId) {
    const chatId = chatIdFor(firebaseUser.uid, activeFriendProfile.userId);
    await setDoc(doc(db, "chats", chatId), {
      participants: [firebaseUser.uid, activeFriendProfile.userId],
      createdAt: firestoreServerTimestamp(),
      updatedAt: firestoreServerTimestamp(),
      lastMessage: "",
      lastSenderId: ""
    }, { merge: true });
    activeFriendProfile.chatId = chatId;
    activeFriendProfile.id = chatId;
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
  profileButton.focus();
}

function toggleChatOptions() {
  const isOpen = chatOptionsMenu.classList.toggle("active");
  chatOptionsMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeChatOptions() {
  chatOptionsMenu.classList.remove("active");
  chatOptionsMenu.setAttribute("aria-hidden", "true");
}

function toggleMuteChat() {
  currentConversation.muted = !currentConversation.muted;
  muteChatButton.textContent = currentConversation.muted ? "Unmute" : "Mute";
  closeChatOptions();
  renderMessages();
  renderConversations(searchInput.value);
}

function clearChat() {
  const ok = window.confirm(`Clear chat with ${currentConversation.name}?`);
  if (!ok) return;
  currentConversation.messages = [];
  currentConversation.time = "Now";
  closeChatOptions();
  renderMessages();
  renderConversations(searchInput.value);
}

async function sendMessage(text) {
  const conversation = currentConversation;
  if (!firebaseUser || !conversation?.chatId || !conversation.userId) return;
  if (!canMessageConversation(conversation)) {
    window.alert(restrictedMessage(conversation));
    return;
  }

  const message = {
    id: `${conversation.id}-${Date.now()}`,
    from: "me",
    text,
    time: currentClockTime(),
    date: "Today",
    status: "sent"
  };

  conversation.messages.push(message);
  conversation.time = "Now";
  moveConversationToTop(currentConversation);
  renderMessages();
  renderConversations(searchInput.value);

  try {
    await addDoc(collection(db, "chats", conversation.chatId, "messages"), {
      text,
      senderId: firebaseUser.uid,
      receiverId: conversation.userId,
      status: "delivered",
      time: message.time,
      date: "Today",
      createdAt: firestoreServerTimestamp()
    });

    await updateDoc(doc(db, "chats", conversation.chatId), {
      lastMessage: text,
      lastSenderId: firebaseUser.uid,
      lastTime: "Now",
      updatedAt: firestoreServerTimestamp()
    });
  } catch (error) {
    window.alert("Message send hoy nai. Firebase rules check koro.");
  }
}

function toggleAttachmentMenu() {
  const isOpen = attachmentMenu.classList.toggle("active");
  attachmentMenu.setAttribute("aria-hidden", String(!isOpen));
}

function closeAttachmentMenu() {
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
  messageForm.classList.toggle("has-text", messageInput.value.trim().length > 0);
}

function sendAttachment(input, label) {
  const file = input.files[0];
  if (!file) return;
  const conversation = currentConversation;
  const message = {
    id: `${currentConversation.id}-${Date.now()}-${label}`,
    from: "me",
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

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => removeMessage(message));

  if (message.from === "me") {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editMessage(row, message));
    menu.appendChild(editButton);
  }

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
  const save = () => {
    if (saved) return;
    saved = true;
    const trimmed = input.value.trim();
    if (trimmed) {
      message.text = trimmed;
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

function removeMessage(message) {
  const ok = window.confirm("Remove this message?");
  if (!ok) return;
  currentConversation.messages = currentConversation.messages.filter((item) => item.id !== message.id);
  closeMessageActions();
  renderMessages();
  renderConversations(searchInput.value);
}

function changeProfilePhoto() {
  const file = profilePhotoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const url = reader.result;
    profilePhoto.src = url;
    myProfile.avatar = url;
    profileButton.querySelector("img").src = url;
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
  profileName.textContent = trimmed;
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

function editPassword(button) {
  if (!currentUser || button.classList.contains("editing")) return;
  const valueNode = button.querySelector("strong");
  const fields = document.createElement("span");
  fields.className = "password-edit-fields";

  const currentInput = document.createElement("input");
  currentInput.type = "password";
  currentInput.placeholder = "Current password";
  currentInput.setAttribute("aria-label", "Current password");

  const newInput = document.createElement("input");
  newInput.type = "password";
  newInput.placeholder = "New password";
  newInput.setAttribute("aria-label", "New password");

  const saveButton = document.createElement("button");
  saveButton.className = "password-save-button";
  saveButton.type = "button";
  saveButton.textContent = "Save";

  fields.append(currentInput, newInput, saveButton);
  button.classList.add("editing");
  valueNode.replaceWith(fields);
  currentInput.focus();

  const closeEditor = () => {
    const strong = document.createElement("strong");
    strong.textContent = "Change";
    fields.replaceWith(strong);
    button.classList.remove("editing");
  };

  const save = () => {
    if (currentInput.value !== currentUser.password) {
      window.alert("Current password thik na");
      currentInput.focus();
      return;
    }

    if (!newInput.value.trim()) {
      window.alert("New password dao");
      newInput.focus();
      return;
    }

    const users = readUsers();
    const user = users.find((item) => item.id === currentUser.id);
    if (user) {
      user.password = newInput.value;
      currentUser = user;
      writeUsers(users);
    }
    closeEditor();
    window.alert("Password changed");
  };

  saveButton.addEventListener("click", save);
  fields.addEventListener("click", (event) => event.stopPropagation());
  fields.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      closeEditor();
    }
  });
}

backButton.addEventListener("click", closeConversation);
loginForm.addEventListener("submit", handleLogin);
signupForm.addEventListener("submit", handleSignup);
authSwitchButton.addEventListener("click", () => {
  const nextMode = signupForm.classList.contains("active") ? "login" : "signup";
  showAuthMode(nextMode);
});
homeOptionsButton.addEventListener("click", toggleHomeOptions);
showArchivedButton.addEventListener("click", () => openSavedView("archived"));
showBlockedButton.addEventListener("click", () => openSavedView("blocked"));
addUserButton.addEventListener("click", toggleUserFinder);
userSearchButton.addEventListener("click", searchUserByNumber);
userSearchNumber.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchUserByNumber();
  }
});
savedCloseButton.addEventListener("click", closeSavedView);
adminUsersButton.addEventListener("click", openAdminUsers);
adminUsersCloseButton.addEventListener("click", closeAdminUsers);
profileButton.addEventListener("click", () => openProfile(myProfile));
chatAvatar.addEventListener("click", () => openFriendProfile(currentConversation));
profileBackdrop.addEventListener("click", closeProfile);
profileCloseButton.addEventListener("click", closeProfile);
profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());
profilePhotoInput.addEventListener("change", changeProfilePhoto);
profileNameButton.addEventListener("click", changeProfileName);
profileName.addEventListener("click", changeProfileName);
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
  if (button) editProfileField(button);
  const passwordButton = event.target.closest("[data-password-action]");
  if (passwordButton) editPassword(passwordButton);
});
profileLogoutButton.addEventListener("click", logout);
seeAllFriendsButton.addEventListener("click", openAllFriends);
friendsCloseButton.addEventListener("click", closeAllFriends);
friendProfileCloseButton.addEventListener("click", closeFriendProfile);
friendProfileMessageButton.addEventListener("click", messageActiveFriendProfile);
chatOptionsButton.addEventListener("click", toggleChatOptions);
muteChatButton.addEventListener("click", toggleMuteChat);
clearChatButton.addEventListener("click", clearChat);
attachmentButton.addEventListener("click", toggleAttachmentMenu);
emojiButton.addEventListener("click", toggleEmojiMenu);
emojiMenu.addEventListener("click", (event) => {
  if (event.target.tagName !== "BUTTON") return;
  messageInput.value += event.target.textContent;
  updateComposerMode();
  closeEmojiMenu();
  messageInput.focus();
});
photoButton.addEventListener("click", () => photoInput.click());
fileButton.addEventListener("click", () => fileInput.click());
photoInput.addEventListener("change", () => sendAttachment(photoInput, "Photo"));
fileInput.addEventListener("change", () => sendAttachment(fileInput, "File"));

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
    closeAttachmentMenu();
    closeEmojiMenu();
    closeChatOptions();
    closeHomeOptions();
    closeMessageActions();
    closeConversationMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!attachmentMenu.contains(event.target) && !attachmentButton.contains(event.target)) {
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
  if (!userFinderPanel.contains(event.target) && !addUserButton.contains(event.target)) {
    closeUserFinder();
  }
    if (!event.target.closest(".message-row")) {
      closeMessageActions();
    }
  if (!event.target.closest(".conversation-menu") && !event.target.closest(".conversation-action-menu")) {
    closeConversationMenu();
  }
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
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

desktopQuery.addEventListener("change", () => {
  if (desktopQuery.matches) {
    homeScreen.classList.add("active");
    chatScreen.classList.add("active");
    phoneShell.classList.add("chat-open");
    renderMessages();
  } else {
    phoneShell.classList.remove("chat-open");
    chatScreen.classList.remove("active");
    homeScreen.classList.add("active");
  }
});

conversations.length = 0;
currentConversation = null;
ensureMessageData();
updateComposerMode();
renderConversations();
messages.innerHTML = "";

if (desktopQuery.matches) {
  chatScreen.classList.add("active");
  phoneShell.classList.add("chat-open");
}

initializeAuth();
