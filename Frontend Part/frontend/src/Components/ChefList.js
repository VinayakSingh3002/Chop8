import React, { useEffect, useState } from "react";
import BookingForm from "./BookingForm";

function ChefList() {
  const [chefs, setChefs] = useState([]);
  const [selectedChef, setSelectedChef] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/chefs")
      .then(res => res.json())
      .then(data => setChefs(data));
  }, []);

  return (
    <div>
      <h2>Available Chefs</h2>

      {chefs.map(chef => (
        <div key={chef.id} style={{border:"1px solid black", margin:"10px"}}>
          <h3>{chef.name}</h3>
          <p>{chef.specialization}</p>
          <p>₹{chef.pricePerDay}</p>

          <button onClick={() => setSelectedChef(chef)}>
            Book Now
          </button>
        </div>
      ))}

      {selectedChef && <BookingForm chef={selectedChef} />}
    </div>
  );
}

export default ChefList;