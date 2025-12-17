import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    checkUser();
    fetchBranches();
  }, []);

  const checkUser = () => {
    const savedUser = localStorage.getItem('dimsum_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      
      // Set selected branch
      if (userData.role === 'kasir' && userData.branch_id) {
        setSelectedBranch(userData.branch_id);
      } else {
        const savedBranch = localStorage.getItem('dimsum_selected_branch');
        if (savedBranch) {
          setSelectedBranch(savedBranch);
        }
      }
    }
    setLoading(false);
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setBranches(data || []);
      
      // Set default branch if not set
      if (!selectedBranch && data && data.length > 0) {
        setSelectedBranch(data[0].id);
        localStorage.setItem('dimsum_selected_branch', data[0].id);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, branch:branches(*)')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Username atau password salah!');
      }

      const userData = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        branch_id: data.branch_id,
        branch: data.branch
      };

      setUser(userData);
      localStorage.setItem('dimsum_user', JSON.stringify(userData));

      // Set branch for kasir
      if (userData.role === 'kasir' && userData.branch_id) {
        setSelectedBranch(userData.branch_id);
        localStorage.setItem('dimsum_selected_branch', userData.branch_id);
      } else if (branches.length > 0) {
        setSelectedBranch(branches[0].id);
        localStorage.setItem('dimsum_selected_branch', branches[0].id);
      }

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedBranch(null);
    localStorage.removeItem('dimsum_user');
    localStorage.removeItem('dimsum_selected_branch');
  };

  const changeBranch = (branchId) => {
    if (user && user.role === 'owner') {
      setSelectedBranch(branchId);
      localStorage.setItem('dimsum_selected_branch', branchId);
    }
  };

  const getCurrentBranch = () => {
    return branches.find(b => b.id === selectedBranch);
  };

  const value = {
    user,
    loading,
    branches,
    selectedBranch,
    login,
    logout,
    changeBranch,
    getCurrentBranch,
    isOwner: user?.role === 'owner',
    isKasir: user?.role === 'kasir'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};