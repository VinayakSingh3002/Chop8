import './App.css';
import { Outlet } from 'react-router';
import Navbar from '../Components/Navbar';
import RatingPoller from '../Components/RatingPoller';
import PaymentReminderPoller from '../Components/PaymentReminderPoller';

function App() {
  return (
    <>
      <Navbar />
      {/* Runs silently on every page — auto rating popup when booking expires */}
      <RatingPoller />
      {/* Runs silently on every page — payment reminder 2 min before expiry */}
      <PaymentReminderPoller />
      <Outlet />
    </>
  );
}

export default App;