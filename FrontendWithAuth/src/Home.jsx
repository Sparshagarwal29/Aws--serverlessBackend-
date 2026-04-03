import { useEffect, useState } from "react";
import { fetchCoffees, createCoffee } from "./utils/apis";
import { useNavigate } from "react-router-dom";
import "./App.css";
import reactImg from "./assets/react.svg";

const Home = () => {
  const [coffees, setCoffees] = useState([]);
  const [coffeeId, setCoffeeId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCoffees().then(data => setCoffees(data.Items || []));
  }, []);

  const handleAddCoffee = async () => {
    if (!coffeeId || !name || !price) {
      alert("Please fill all fields");
      return;
    }
    const newCoffee = { coffeeId, name, price: Number(price), available };
    await createCoffee(newCoffee);
    setCoffees([...coffees, newCoffee]);
    setCoffeeId("");
    setName("");
    setPrice("");
    setAvailable(false);
  };

  return (
    <div className="container">
      <h1>Coffee List</h1>
      <div className="add-coffee-form">
        <input className="styled-input" type="text" placeholder="Coffee ID" value={coffeeId} onChange={(e) => setCoffeeId(e.target.value)} />
        <input className="styled-input" type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="styled-input" type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <label>
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Available
        </label>
        <button onClick={handleAddCoffee}>Add Coffee</button>
      </div>
      <div className="coffee-list">
        {coffees.map(coffee => (
          <div key={coffee.coffeeId} className="coffee-card" onClick={() => navigate(`/details/${coffee.coffeeId}`)}>
            <h3>{coffee.name}</h3>
            <img src={reactImg} alt="React Logo" />
            <p>Price: ${coffee.price}</p>
            <p>{coffee.available ? "Available" : "Not Available"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;