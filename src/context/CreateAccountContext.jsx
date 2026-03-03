import React, { createContext, useContext, useState } from "react";
import CreateAccountModal from "../components/CreateAccountModal";

const STORAGE_KEY = "beatify_logged_in";
const STORAGE_USER_NAME = "beatify_user_name";
const STORAGE_ACCOUNT_ID = "beatify_account_id";

const CreateAccountContext = createContext(null);

export function CreateAccountProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_USER_NAME) || "";
    } catch {
      return "";
    }
  });
  const [accountId, setAccountId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_ACCOUNT_ID) || "";
    } catch {
      return "";
    }
  });

  const openCreateAccount = () => setIsOpen(true);
  const closeCreateAccount = () => setIsOpen(false);

  const login = (payload) => {
    try {
      const id = (payload?.accountId || "").toString().trim();
      const displayName = (payload?.name || "").trim();
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem(STORAGE_USER_NAME, displayName);
      if (id) localStorage.setItem(STORAGE_ACCOUNT_ID, id);
      setIsLoggedIn(true);
      setUserName(displayName);
      setAccountId(id);
    } catch (e) {
      console.error("Failed to save login state:", e);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_USER_NAME);
      localStorage.removeItem(STORAGE_ACCOUNT_ID);
      setIsLoggedIn(false);
      setUserName("");
      setAccountId("");
    } catch (e) {
      console.error("Failed to clear login state:", e);
    }
  };

  return (
    <CreateAccountContext.Provider
      value={{
        openCreateAccount,
        closeCreateAccount,
        isLoggedIn,
        userName,
        accountId,
        login,
        logout,
      }}
    >
      {children}
      <CreateAccountModal
        isOpen={isOpen}
        onClose={closeCreateAccount}
        onAccountCreated={login}
      />
    </CreateAccountContext.Provider>
  );
}

export function useCreateAccount() {
  const ctx = useContext(CreateAccountContext);
  if (!ctx) {
    throw new Error("useCreateAccount must be used within CreateAccountProvider");
  }
  return ctx;
}
