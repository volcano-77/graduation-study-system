import { Navigate } from 'react-router-dom';

function AdminDashboard() {
  return <Navigate to="/admin/overview" replace />;
}

export default AdminDashboard;
