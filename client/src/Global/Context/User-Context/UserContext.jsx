import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Initial load from localStorage (only once)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Login function
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // Update user if backend sends fresh data
  const updateUser = (newData) => {
    setUser(newData);
    localStorage.setItem("user", JSON.stringify(newData));
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom Hook
export const useUser = () => useContext(UserContext);