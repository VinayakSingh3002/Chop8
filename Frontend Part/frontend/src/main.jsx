import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from "react-router";
import "./index.css";
import App              from "./Routes/App";
import Home             from "./pages/Home.jsx";
import Login            from "./pages/Login.jsx";
import Services         from "./pages/Services.jsx";
import SignUp           from "./pages/SignUp.jsx";
import About            from "./pages/About.jsx";
import Profile          from "./pages/Profile.jsx";
import Orders           from "./pages/Orders.jsx";
import ChefOrders       from "./pages/ChefOrders.jsx";
import Payments         from "./pages/Payments.jsx";
import RecommendedChefs from "./pages/RecommendedChefs.jsx";  // ← ADD THIS LINE

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/"              element={<Home />} />
      <Route path="/services"      element={<Services />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/signup"        element={<SignUp />} />
      <Route path="/about"         element={<About />} />
      <Route path="/orders"        element={<Orders />} />
      <Route path="/chef-orders"   element={<ChefOrders />} />
      <Route path="/profile"       element={<Profile />} />
      <Route path="/payments"      element={<Payments />} />
      <Route path="/recommended"   element={<RecommendedChefs />} />  {/* ← ADD THIS LINE */}
      <Route path="*"              element={<h1>Page Not Found</h1>}/>
    </Route>
  )
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);