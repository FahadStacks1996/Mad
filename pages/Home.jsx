import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./Home.css";
import { FaPizzaSlice, FaBoxes, FaClipboardList, FaWarehouse, FaMotorcycle, FaSignOutAlt, FaHome } from "react-icons/fa";

const navItems = [
  { to: "/home", label: "Dashboard", icon: <FaHome /> },
  { to: "/home/pos", label: "POS", icon: <FaPizzaSlice /> },
  { to: "/home/product-management", label: "Product Management", icon: <FaBoxes /> },
  { to: "/home/order-history", label: "Order History", icon: <FaClipboardList /> },
  { to: "/home/inventory-management", label: "Inventory", icon: <FaWarehouse /> },
  { to: "/home/rider-management", label: "Rider Management", icon: <FaMotorcycle /> },
];

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-root">
     <aside className="dashboard-sidebar">
  <div className="sidebar-logo">
    <img src="/Images/madpizzalogo.png" alt="Mad Pizza Logo" />
  </div>
  <nav className="sidebar-nav">
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          "sidebar-link" + (isActive ? " active" : "")
        }
        end={item.to === "/home"}
      >
        <span className="sidebar-icon">{item.icon}</span>
        <span className="sidebar-label">{item.label}</span>
      </NavLink>
    ))}
  </nav>
  <button className="sidebar-logout sticky-logout" onClick={handleLogout}>
    <FaSignOutAlt style={{ marginRight: 10 }} />
    Logout
  </button>
</aside>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Home;