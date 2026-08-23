import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications';
import GlobalTasks from './pages/GlobalTasks';
import GlobalFiles from './pages/GlobalFiles';
import AllFiles from './pages/AllFiles';
import AdminOverview from './pages/AdminOverview';
import AdminUsers from './pages/AdminUsers';
import AdminGroups from './pages/AdminGroups';
import AdminTasks from './pages/AdminTasks';
import AdminFiles from './pages/AdminFiles';
import AllGroupRankings from './pages/AllGroupRankings';
import Layout from './components/Layout';

function getCurrentUser() {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function RouteGuard() {
  const token = localStorage.getItem('token');

  if (!token || token.trim() === '') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function UserRouteGuard() {
  const currentUser = getCurrentUser();
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/overview" replace />;
  }
  return <Outlet />;
}

function AdminRouteGuard() {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  const token = localStorage.getItem('token');
  if (!token || token.trim() === '') {
    return <Navigate to="/login" replace />;
  }

  const currentUser = getCurrentUser();
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/overview" replace />;
  }

  return <Navigate to="/groups" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<RouteGuard />}>
          <Route element={<Layout />}>
            <Route element={<UserRouteGuard />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:groupId" element={<GroupDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/global-tasks" element={<GlobalTasks />} />
              <Route path="/global-files" element={<GlobalFiles />} />
              <Route path="/all-files" element={<AllFiles />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<AdminRouteGuard />}>
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/admin/overview" element={<AdminOverview />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/groups" element={<AdminGroups />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/files" element={<AdminFiles />} />
              <Route path="/admin/all-group-rankings" element={<AllGroupRankings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
